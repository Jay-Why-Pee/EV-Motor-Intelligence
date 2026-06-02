import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

// Traction-motor focused keywords
const PATENT_QUERIES = [
  'hairpin winding stator electric vehicle motor',
  'axial flux motor traction EV',
  'IPMSM rotor design electric vehicle',
  'EESM externally excited synchronous motor',
  'dy-free permanent magnet traction motor',
  'oil cooling stator EV motor',
];

const RESEARCH_QUERIES = [
  'axial flux motor electric vehicle 2024',
  'hairpin winding AC loss traction motor',
  'IPMSM torque ripple reduction EV',
  'rare-earth-free permanent magnet motor',
  'silicon carbide inverter traction motor co-design',
  'electric vehicle motor thermal management',
];

async function firecrawlSearch(apiKey: string, query: string, sources: string[], limit = 5) {
  const res = await fetch(`${FIRECRAWL_V2}/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      limit,
      sources: sources.map(s => ({ type: 'web' })).slice(0, 1), // web only
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`Firecrawl search failed (${res.status}): ${txt}`);
    return [];
  }
  const data = await res.json();
  // v2 returns { data: { web: [...] } } or { web: [...] }
  const web = data?.data?.web || data?.web || data?.data || [];
  return Array.isArray(web) ? web : [];
}

async function callAI(lovableApiKey: string, system: string, user: string) {
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });
  if (!res.ok) throw new Error(`AI error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  let content = data.choices[0].message.content || '';
  content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.ok) return true;
    // some servers reject HEAD
    const r2 = await fetch(url, { method: 'GET', redirect: 'follow' });
    return r2.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const apikeyHeader = req.headers.get('apikey') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader?.replace('Bearer ', '') || '';
  if (!(token === anonKey || token === serviceKey || apikeyHeader === anonKey || apikeyHeader === serviceKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!firecrawlKey || !lovableKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Missing required env vars' }), { status: 500, headers: corsHeaders });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode || 'both'; // 'patents' | 'research' | 'both'

  const results = { patents: 0, research: 0, errors: [] as string[] };

  try {
    // ===== PATENTS =====
    if (mode === 'patents' || mode === 'both') {
      const patentRows: any[] = [];
      for (const q of PATENT_QUERIES) {
        const query = `site:patents.google.com ${q}`;
        const items = await firecrawlSearch(firecrawlKey, query, ['web'], 4);
        console.log(`[patents] "${q}" → ${items.length} results`);
        for (const it of items) {
          const url: string = it.url || '';
          if (!url.includes('patents.google.com/patent/')) continue;
          const markdown: string = it.markdown || it.description || it.title || '';
          if (!markdown || markdown.length < 200) continue;

          // Verify link is alive (Google Patents direct pages do load)
          const ok = await verifyUrl(url);
          if (!ok) { console.log(`skip dead url: ${url}`); continue; }

          const ai = await callAI(
            lovableKey,
            `You are an EV traction motor patent analyst. Given the patent page content, output ONLY JSON:
{
 "title": "patent title (English, concise)",
 "summary": "3-5 sentence summary IN KOREAN focusing on the motor technology (구조/효과/혁신점)",
 "applicant": "primary applicant/assignee company",
 "publication_number": "publication or application number e.g. US20240xxxxx",
 "filing_date": "YYYY-MM-DD or YYYY if known, else empty string",
 "is_traction_motor": true/false
}
Set is_traction_motor=false if the patent is not about EV traction motor hardware (e.g. batteries, inverters, charging, software).`,
            `URL: ${url}\n\nCONTENT:\n${markdown.slice(0, 8000)}`
          );
          if (!ai || !ai.is_traction_motor || !ai.title || !ai.summary) continue;

          patentRows.push({
            title: ai.title,
            summary: ai.summary,
            applicant: ai.applicant || null,
            publication_number: ai.publication_number || null,
            filing_date: ai.filing_date || null,
            url,
            source: 'Google Patents',
            keyword: q,
          });
        }
      }

      if (patentRows.length > 0) {
        await supabase.from('patents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error } = await supabase.from('patents').insert(patentRows);
        if (error) results.errors.push(`patents insert: ${error.message}`);
        else results.patents = patentRows.length;
      }
    }

    // ===== RESEARCH =====
    if (mode === 'research' || mode === 'both') {
      const paperRows: any[] = [];
      for (const q of RESEARCH_QUERIES) {
        // Prefer arxiv/IEEE/MDPI which Firecrawl can scrape cleanly
        const query = `(site:arxiv.org OR site:mdpi.com OR site:ieeexplore.ieee.org OR site:sciencedirect.com) ${q}`;
        const items = await firecrawlSearch(firecrawlKey, query, ['web'], 4);
        console.log(`[research] "${q}" → ${items.length} results`);
        for (const it of items) {
          const url: string = it.url || '';
          if (!url) continue;
          const markdown: string = it.markdown || it.description || it.title || '';
          if (!markdown || markdown.length < 200) continue;

          const ok = await verifyUrl(url);
          if (!ok) continue;

          const ai = await callAI(
            lovableKey,
            `You are an EV traction motor research analyst. Given the paper page content, output ONLY JSON:
{
 "title": "paper title (English)",
 "summary": "3-5 sentence summary IN KOREAN focusing on the motor technology contribution (방법/결과/의의)",
 "authors": "first author et al.",
 "venue": "journal or conference name",
 "published_date": "YYYY or YYYY-MM if known, else empty string",
 "is_traction_motor": true/false
}
Set is_traction_motor=false if the paper is not about EV traction motor hardware/control (exclude batteries, charging, ADAS).`,
            `URL: ${url}\n\nCONTENT:\n${markdown.slice(0, 8000)}`
          );
          if (!ai || !ai.is_traction_motor || !ai.title || !ai.summary) continue;

          paperRows.push({
            title: ai.title,
            summary: ai.summary,
            authors: ai.authors || null,
            venue: ai.venue || null,
            published_date: ai.published_date || null,
            url,
            source: new URL(url).hostname.replace('www.', ''),
            keyword: q,
          });
        }
      }

      if (paperRows.length > 0) {
        await supabase.from('research_papers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error } = await supabase.from('research_papers').insert(paperRows);
        if (error) results.errors.push(`research insert: ${error.message}`);
        else results.research = paperRows.length;
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e), ...results }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
