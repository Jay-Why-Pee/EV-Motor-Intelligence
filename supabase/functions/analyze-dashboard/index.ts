import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const missingTokens = new Set(['', '-', '정보 없음', '없음', '미확인', 'n/a', 'na', 'unknown']);
const allowedPowertrains = new Set(['BEV', 'PHEV', 'MHEV', 'HEV']);

const normalizeField = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  if (missingTokens.has(text.toLowerCase())) return '-';
  return text;
};

const normalizePowertrain = (raw: any): string => {
  const candidates = [raw?.powertrain, raw?.powerTrain, raw?.fuelType, raw?.vehicleType];
  for (const v of candidates) {
    if (!v) continue;
    const u = String(v).toUpperCase().replace(/\s+/g, '');
    if (allowedPowertrains.has(u)) return u;
    if (u.includes('PHEV') || /PLUG[-\s]?IN/i.test(String(v))) return 'PHEV';
    if (u.includes('MHEV') || /MILD|48V|BSG/i.test(String(v))) return 'MHEV';
    if (u.includes('HEV') || /HYBRID/i.test(String(v))) return 'HEV';
    if (u.includes('BEV') || /BATTERY\s*ELECTRIC|전기/i.test(String(v))) return 'BEV';
  }
  const ctx = JSON.stringify(raw).toLowerCase();
  if (/\bphev\b|plug.?in/.test(ctx)) return 'PHEV';
  if (/\bmhev\b|mild.?hybrid|48v/.test(ctx)) return 'MHEV';
  if (/\bbev\b|battery.?electric/.test(ctx)) return 'BEV';
  if (/\bhev\b|hybrid/.test(ctx)) return 'HEV';
  return '-';
};

const normalizeMotorPosition = (raw: any, pt: string): string => {
  const v = normalizeField(raw?.motorPosition || raw?.motor_position || raw?.position);
  if (v !== '-') {
    const m = v.toUpperCase().replace(/\s+/g, '').match(/^P[0-4](\+P[0-4])*$/);
    if (m) return m[0];
  }
  const ctx = JSON.stringify(raw).toLowerCase();
  if (pt === 'BEV') {
    if (/tri.?motor|triple|3.?motor/.test(ctx)) return 'P3+P4+P4';
    if (/dual.?motor|awd|all.?wheel|4wd|e-four/.test(ctx)) return 'P3+P4';
    return 'P3';
  }
  if (pt === 'PHEV') return /awd|4wd|dual|e-four/.test(ctx) ? 'P2+P4' : 'P2';
  if (pt === 'MHEV') return 'P0';
  if (pt === 'HEV') return 'P2';
  return '-';
};

const extractRange = (raw: any): string => {
  for (const k of ['rangeKm', 'range_km', 'range', 'evRange', 'electricRange', 'wltpKm', 'epaKm']) {
    const v = raw?.[k];
    if (!v) continue;
    const nums = String(v).match(/\d{2,4}/g)?.map(Number).filter(n => n >= 20 && n <= 1200);
    if (nums?.length) return String(Math.max(...nums));
  }
  return '-';
};

const normalizeSpec = (raw: any) => {
  const pt = normalizePowertrain(raw);
  return {
    year: normalizeField(raw?.year || raw?.launchYear),
    oem: normalizeField(raw?.oem || raw?.brand || raw?.manufacturer),
    model: normalizeField(raw?.model || raw?.vehicle || raw?.name),
    powertrain: pt,
    motorPosition: normalizeMotorPosition(raw, pt),
    segment: normalizeField(raw?.segment),
    priceUsd: normalizeField(raw?.priceUsd),
    motorSupplier: normalizeField(raw?.motorSupplier),
    torqueNm: normalizeField(raw?.torqueNm),
    powerKw: normalizeField(raw?.powerKw),
    maxSpeedRpm: normalizeField(raw?.maxSpeedRpm),
    rangeKm: extractRange(raw),
    notable: normalizeField(raw?.notable),
  };
};

const dedupeSpecs = (specs: any[]) => {
  const map = new Map<string, any>();
  for (const raw of specs) {
    const s = normalizeSpec(raw);
    if (s.oem === '-' || s.model === '-') continue;
    const key = `${s.oem.toLowerCase()}::${s.model.toLowerCase()}::${s.powertrain}`;
    if (!map.has(key)) map.set(key, s);
  }
  return [...map.values()].sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
};

const sanitizeJson = (s: string) => s.replace(/```json\s*/gi, '').replace(/```/g, '').replace(/\u0000/g, '').trim();

const parseJson = (content: string) => {
  const cleaned = sanitizeJson(content);
  const fixTrailing = (s: string) => s.replace(/,\s*([}\]])/g, '$1');
  
  // Try full content
  try { return JSON.parse(fixTrailing(cleaned)); } catch {}
  
  // Try balanced extraction
  let depth = 0, inStr = false, esc = false;
  const s = cleaned.indexOf('{');
  if (s >= 0) {
    for (let i = s; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') depth++;
      if (c === '}') { depth--; if (depth === 0) { try { return JSON.parse(fixTrailing(cleaned.slice(s, i + 1))); } catch { break; } } }
    }
  }
  
  // Last resort: first { to last }
  const end = cleaned.lastIndexOf('}');
  if (s >= 0 && end > s) {
    try { return JSON.parse(fixTrailing(cleaned.slice(s, end + 1))); } catch {}
  }
  
  throw new Error('JSON parse failed');
};

const callAi = async (apiKey: string, model: string, system: string, user: string, maxTokens: number, temp: number, retries = 2): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          response_format: { type: 'json_object' }, temperature: temp, max_tokens: maxTokens,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`AI HTTP ${res.status} (attempt ${attempt}): ${body.slice(0, 500)}`);
        if (attempt < retries) continue;
        throw new Error(`AI ${res.status}`);
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      const finishReason = data?.choices?.[0]?.finish_reason;
      if (!text) {
        console.error(`Empty AI response (attempt ${attempt}), finish_reason: ${finishReason}`);
        if (attempt < retries) continue;
        throw new Error('Empty AI response');
      }
      if (finishReason === 'length') {
        console.warn(`AI response truncated (attempt ${attempt}), trying with fewer tokens...`);
      }
      console.log(`AI response (attempt ${attempt}): ${text.length} chars, finish: ${finishReason}`);
      return parseJson(text);
    } catch (e) {
      if (attempt < retries && (e as Error).message?.includes('parse')) {
        console.warn(`JSON parse failed (attempt ${attempt}), retrying...`);
        continue;
      }
      throw e;
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const apikeyHeader = req.headers.get('apikey') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader?.replace('Bearer ', '') || '';
  if (token !== anonKey && token !== serviceKey && apikeyHeader !== anonKey && apikeyHeader !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const apiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch news
    const { data: newsData } = await supabase.from('news').select('*').order('date', { ascending: false }).limit(60);
    if (!newsData?.length) {
      return new Response(JSON.stringify({ error: 'No news data' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const newsBrief = newsData.map(a => `[${a.category?.join(',')}] ${a.title_kr} (${a.source}, ${a.date})`).join('\n');

    // Fetch existing motor specs to merge with
    const { data: existingRow } = await supabase.from('market_analysis').select('content').eq('type', 'dashboard_v2').maybeSingle();
    const existingSpecs: any[] = (existingRow?.content as any)?.motorSpecs || [];

    // 1) Overview (wordcloud + roadmap) - fast call
    const overviewPrompt = `EV 모터 기술 애널리스트. JSON만 답해라.
{
  "wordCloud": [{"text":"키워드","value":1}],
  "roadmap": {
    "prm": [{"year":"2024","category":"카테고리","title":"제목","description":"설명","status":"past|current|future"}],
    "trm": [{"year":"2024","category":"카테고리","title":"제목","description":"설명","status":"past|current|future"}]
  }
}
wordCloud: EV 모터 기술 키워드 20~30개. 영어 기술 용어는 반드시 영어 그대로 출력(예: "Hairpin Winding", "SiC MOSFET", "Axial Flux"). 한글 번역 금지.
PRM 20개 이상: 모터 아키텍처(IPMSM→EESM→Axial Flux), 800V, 멀티스피드, X-in-1 통합 등. 2024~2035년 범위.
TRM 35개 이상: Stator Core(NO Steel→Amorphous), Hairpin Winding(I-pin→Continuous), Rotor Magnet(NdFeB→Dy-free→Ferrite), Cooling(Oil Spray→Direct Slot), SiC MOSFET(Planar→Trench), Resolver→Inductive Encoder, Lamination(0.3mm→0.2mm→0.1mm), Busbar(Cu→Al→Flexible PCB), Housing(Al Cast→CFRP), Insulation(Class H→Class R), Bearing(Steel→Ceramic→Mag), Sealing(Lip→Labyrinth→Mag), Connector(HV Cu→Al), NVH(Skew→Active Noise Cancel), EMC Shielding, Thermal Interface Material, Winding End-Turn 최적화 등. 2024~2035년 범위.
status: 2024이전 past, 2024-2025 current, 2026+ future.`;

    // 2) Motor specs - incremental update (top 80 new/updated models only)
    const motorPrompt = `글로벌 EV/HEV 파워트레인 데이터 리서처. JSON으로 답해라.
{"motorSpecs":[{"year":"","oem":"","model":"","powertrain":"BEV|PHEV|MHEV|HEV","motorPosition":"P0~P4","segment":"","priceUsd":"","motorSupplier":"","torqueNm":"","powerKw":"","maxSpeedRpm":"","rangeKm":"","notable":""}]}

규칙:
- 80~120개 차종. 2023~2026 글로벌 주요 EV/HEV/PHEV 차종.
- powertrain 필수(BEV/PHEV/MHEV/HEV 중 택1).
- motorPosition 필수(BEV싱글→P3, 듀얼→P3+P4, PHEV→P2, MHEV→P0, HEV→P2).
- rangeKm: BEV는 반드시 WLTP/EPA 수치 기입. HEV/MHEV는 EV모드 주행거리 미제공시 "-".
- 2025 Hyundai/Kia/Genesis 필수 포함: IONIQ 5 N, IONIQ 5(롱레인지), IONIQ 6, EV3, EV5, EV6, EV6 GT, EV9, EV9 GT, Kona Electric, Niro EV, Ray EV, GV60, Electrified GV70, Electrified G80, Tucson HEV, Santa Fe HEV, Sorento HEV/PHEV, Sportage HEV/PHEV, K8 HEV, K5 HEV, Carnival HEV 등
- Tesla, BMW, Mercedes, VW, Toyota, BYD, Xiaomi, Rivian, Lucid 등 글로벌 OEM도 포함.
- "정보 없음" 금지. 불가시 "-"만. 듀얼모터 토크/출력은 슬래시(/) 구분.`;

    console.log('Starting AI calls...');

    // Run both in parallel
    const [overviewData, motorData] = await Promise.all([
      callAi(apiKey, 'google/gemini-2.5-flash', overviewPrompt, `최근 뉴스 ${newsData.length}건:\n${newsBrief}`, 8000, 0.4),
      callAi(apiKey, 'google/gemini-2.5-flash', motorPrompt, `최근 뉴스 참고:\n${newsBrief.slice(0, 3000)}`, 10000, 0.15),
    ]);

    console.log('AI calls complete');

    // Merge new specs with existing
    const newSpecs = Array.isArray(motorData?.motorSpecs) ? motorData.motorSpecs : [];
    const allSpecs = [...newSpecs, ...existingSpecs];
    const finalSpecs = dedupeSpecs(allSpecs).slice(0, 300);

    const dashboard = {
      wordCloud: Array.isArray(overviewData?.wordCloud) ? overviewData.wordCloud : [],
      roadmap: {
        prm: Array.isArray(overviewData?.roadmap?.prm) ? overviewData.roadmap.prm : [],
        trm: Array.isArray(overviewData?.roadmap?.trm) ? overviewData.roadmap.trm : [],
      },
      motorSpecs: finalSpecs,
    };

    // Upsert
    const { data: existing } = await supabase.from('market_analysis').select('id').eq('type', 'dashboard_v2').maybeSingle();
    if (existing) {
      await supabase.from('market_analysis').update({
        content: dashboard, news_analyzed_count: newsData.length, generated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('market_analysis').insert({
        type: 'dashboard_v2', content: dashboard, news_analyzed_count: newsData.length, generated_at: new Date().toISOString(),
      });
    }

    console.log(`Done: ${finalSpecs.length} specs, ${dashboard.roadmap.prm.length} PRM, ${dashboard.roadmap.trm.length} TRM`);

    return new Response(JSON.stringify({ success: true, specs: finalSpecs.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
