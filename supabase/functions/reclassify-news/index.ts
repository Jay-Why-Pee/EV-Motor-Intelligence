// Reclassifies existing news rows using the same deterministic rule tagger
// used in crawl-news. Adds supplier/OEM/region tags that AI missed on the
// first pass. Idempotent — safe to run repeatedly.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORY_WHITELIST = new Set([
  "Asia","Europe","North America","China","GM","Ford","Mercedes-Benz","BMW","Volkswagen","Honda","Hyundai","Stellantis","Toyota","Tesla","Nissan","Renault","BYD","Xiaomi","Geely","Bosch","ZF","Schaeffler","LG Magna","Denso","Magna","Hyundai Mobis","AISIN","BorgWarner","Hitachi Astemo","Other"
]);

const COMPANY_RULES: { cat: string; pattern: RegExp; domains?: string[] }[] = [
  { cat: "Bosch",          pattern: /\bBosch\b/i, domains: ["bosch.com","bosch-mobility.com","bosch-presse.de"] },
  { cat: "ZF",             pattern: /\bZF\s+(Friedrichshafen|Group|AG)\b|\bZF\b(?=\s+(said|announced|develops|unveil|supplies|launched|partners|acquires|invests|will|has|is|to|electric|e-drive|drive))|(?<=\bfrom\s)ZF\b|(?<=\bby\s)ZF\b/i, domains: ["zf.com","press.zf.com"] },
  { cat: "Schaeffler",     pattern: /\bSchaeffler\b/i, domains: ["schaeffler.com"] },
  { cat: "LG Magna",       pattern: /\bLG\s*Magna\b|\bLG\s+Magna\s+e-?Powertrain\b/i },
  { cat: "Denso",          pattern: /\bDenso\b/i, domains: ["denso.com"] },
  { cat: "Magna",          pattern: /\bMagna\s+International\b|\bMagna\b(?!\s*Carta)/i, domains: ["magna.com"] },
  { cat: "Hyundai Mobis",  pattern: /\bHyundai\s+Mobis\b|\bMobis\b/i, domains: ["mobis.com","mobis.co.kr"] },
  { cat: "AISIN",          pattern: /\bAisin\b/i, domains: ["aisin.com"] },
  { cat: "BorgWarner",     pattern: /\bBorg\s*Warner\b/i, domains: ["borgwarner.com"] },
  { cat: "Hitachi Astemo", pattern: /\bHitachi\s+Astemo\b/i, domains: ["hitachiastemo.com"] },
  { cat: "Tesla",          pattern: /\bTesla\b/i, domains: ["tesla.com"] },
  { cat: "BYD",            pattern: /\bBYD\b/i },
  { cat: "Hyundai",        pattern: /\bHyundai\b|\bKia\b|\bGenesis\b/i, domains: ["hyundai.com","kia.com"] },
  { cat: "GM",             pattern: /\bGeneral\s+Motors\b|\bGM\b|\bChevrolet\b|\bCadillac\b|\bGMC\b/i, domains: ["gm.com"] },
  { cat: "Ford",           pattern: /\bFord\b/i, domains: ["ford.com"] },
  { cat: "Volkswagen",     pattern: /\bVolkswagen\b|\bVW\b|\bAudi\b|\bPorsche\b|\bSkoda\b|\bSEAT\b/i, domains: ["volkswagen.com","vw.com"] },
  { cat: "Mercedes-Benz",  pattern: /\bMercedes(-Benz)?\b|\bDaimler\b/i, domains: ["mercedes-benz.com"] },
  { cat: "BMW",            pattern: /\bBMW\b|\bMINI\b/i, domains: ["bmw.com","bmwgroup.com"] },
  { cat: "Toyota",         pattern: /\bToyota\b|\bLexus\b/i, domains: ["toyota.com"] },
  { cat: "Stellantis",     pattern: /\bStellantis\b|\bJeep\b|\bChrysler\b|\bDodge\b|\bRam\b|\bFiat\b|\bPeugeot\b|\bCitro[eë]n\b|\bOpel\b|\bMaserati\b|\bAlfa\s+Romeo\b/i, domains: ["stellantis.com"] },
  { cat: "Nissan",         pattern: /\bNissan\b|\bInfiniti\b/i, domains: ["nissan.com"] },
  { cat: "Renault",        pattern: /\bRenault\b/i, domains: ["renault.com"] },
  { cat: "Honda",          pattern: /\bHonda\b|\bAcura\b/i, domains: ["honda.com"] },
  { cat: "Xiaomi",         pattern: /\bXiaomi\b/i },
  { cat: "Geely",          pattern: /\bGeely\b|\bZeekr\b|\bLynk\s*&\s*Co\b|\bPolestar\b|\bVolvo\s+Cars?\b/i },
];
const REGION_RULES: { cat: string; pattern: RegExp }[] = [
  { cat: "China",         pattern: /\bChina\b|\bChinese\b|\bBeijing\b|\bShanghai\b|\bShenzhen\b/i },
  { cat: "North America", pattern: /\b(U\.?S\.?A?|United\s+States|America(n)?|Canada|Mexico|Detroit|Michigan|California|Texas)\b/i },
  { cat: "Europe",        pattern: /\bEurope(an)?|Germany|German|France|French|UK|Britain|British|Italy|Spain|Netherlands|Sweden|Norway|EU\b/i },
  { cat: "Asia",          pattern: /\bJapan(ese)?|Korea(n)?|Seoul|Tokyo|Taiwan|India(n)?|Vietnam|Thailand/i },
];

function applyRuleTags(row: { title: string; title_kr?: string; summary?: string; url?: string }): string[] {
  const text = `${row.title || ''} ${row.title_kr || ''} ${row.summary || ''}`;
  let host = '';
  try { host = new URL(row.url || '').hostname.toLowerCase(); } catch {}
  const tags = new Set<string>();
  for (const r of COMPANY_RULES) {
    if (r.pattern.test(text)) tags.add(r.cat);
    else if (host && r.domains && r.domains.some(d => host === d || host.endsWith('.' + d))) tags.add(r.cat);
  }
  for (const r of REGION_RULES) if (r.pattern.test(text)) tags.add(r.cat);
  return Array.from(tags);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') || '';
  const apikeyHeader = req.headers.get('apikey') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader.replace('Bearer ', '');
  const authorized = token === anonKey || token === serviceKey || apikeyHeader === anonKey || apikeyHeader === serviceKey;
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  let offset = 0;
  const page = 500;
  let scanned = 0;
  let updated = 0;

  while (true) {
    const { data, error } = await supabase
      .from('news')
      .select('id, title, title_kr, summary, url, category')
      .order('created_at', { ascending: false })
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      scanned++;
      const ruleTags = applyRuleTags(row as any);
      const existing = Array.isArray(row.category) ? row.category : [];
      const merged = new Set<string>([...existing, ...ruleTags].filter(c => CATEGORY_WHITELIST.has(c)));
      // If any real tag exists, drop "Other"
      if (merged.size > 1) merged.delete('Other');
      if (merged.size === 0) merged.add('Other');
      const next = Array.from(merged).sort();
      const prev = [...existing].sort();
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        const { error: upErr } = await supabase.from('news').update({ category: next }).eq('id', row.id);
        if (!upErr) updated++;
      }
    }

    if (data.length < page) break;
    offset += page;
  }

  return new Response(JSON.stringify({ scanned, updated }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
