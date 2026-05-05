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
  let torqueVehicle = normalizeField(raw?.torqueVehicle || raw?.wheelTorque || raw?.vehicleTorque);
  let torqueMotor = normalizeField(raw?.torqueMotor || raw?.motorTorque);
  const torqueNm = normalizeField(raw?.torqueNm || raw?.torque);
  
  // If torqueVehicle == torqueMotor, they're likely both motor torque (AI error)
  // Vehicle torque should be 5-12x motor torque due to gear ratio
  if (torqueVehicle !== '-' && torqueMotor !== '-' && torqueVehicle === torqueMotor) {
    // Keep as motor torque, invalidate vehicle torque (needs separate source)
    torqueVehicle = '-';
  }
  
  // Validate torqueVehicle vs torqueMotor ratio
  if (torqueVehicle !== '-' && torqueMotor !== '-') {
    const tv = parseFloat(torqueVehicle.replace(/[^0-9.]/g, ''));
    const tm = parseFloat(torqueMotor.replace(/[^0-9.]/g, ''));
    if (tv > 0 && tm > 0) {
      const ratio = tv / tm;
      // Gear ratio is typically 5~12:1. If ratio < 3 or suspiciously exact (10x, 5x), invalidate.
      const isExactMultiple = Math.abs(ratio - Math.round(ratio)) < 0.01 && ratio >= 5;
      if (ratio < 3 || isExactMultiple) {
        // Likely AI-fabricated (multiplied by round number) or too close
        torqueVehicle = '-';
      }
    }
  }

  return {
    year: normalizeField(raw?.year || raw?.launchYear),
    oem: normalizeField(raw?.oem || raw?.brand || raw?.manufacturer),
    model: normalizeField(raw?.model || raw?.vehicle || raw?.name),
    powertrain: pt,
    motorPosition: normalizeMotorPosition(raw, pt),
    segment: normalizeField(raw?.segment),
    priceUsd: normalizeField(raw?.priceUsd || raw?.price_usd || raw?.price),
    motorSupplier: normalizeField(raw?.motorSupplier || raw?.motor_supplier || raw?.supplier),
    torqueNm: torqueMotor !== '-' ? torqueMotor : torqueNm,
    torqueVehicle,
    torqueMotor: torqueMotor !== '-' ? torqueMotor : torqueNm,
    powerKw: normalizeField(raw?.powerKw || raw?.power_kw || raw?.power),
    maxSpeedRpm: normalizeField(raw?.maxSpeedRpm || raw?.max_speed_rpm || raw?.maxSpeed),
    rangeKm: extractRange(raw),
    notable: normalizeField(raw?.notable || raw?.technology || raw?.tech),
  };
};

// Smart merge: when merging two specs for the same key, prefer non-'-' values
const mergeSpecs = (newSpec: any, oldSpec: any): any => {
  const merged = { ...oldSpec };
  for (const key of Object.keys(newSpec)) {
    if (newSpec[key] !== '-' && newSpec[key] !== '') {
      merged[key] = newSpec[key];
    }
  }
  return merged;
};

const dedupeAndMergeSpecs = (specs: any[]) => {
  const map = new Map<string, any>();
  for (const raw of specs) {
    const s = normalizeSpec(raw);
    if (s.oem === '-' || s.model === '-') continue;
    const key = `${s.oem.toLowerCase()}::${s.model.toLowerCase()}::${s.powertrain}`;
    if (map.has(key)) {
      // Smart merge: keep non-'-' values from both
      map.set(key, mergeSpecs(s, map.get(key)));
    } else {
      map.set(key, s);
    }
  }
  return [...map.values()].sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
};

const sanitizeJson = (s: string) => s.replace(/```json\s*/gi, '').replace(/```/g, '').replace(/\u0000/g, '').trim();

const DEFAULT_UA = 'Mozilla/5.0 (compatible; LovableLinkVerifier/1.0)';

const normalizeUrl = (raw?: string) => {
  try {
    let value = (raw || '').trim();
    if (!value) return '';
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
};

const verifyExternalLink = async (inputUrl?: string, hints: string[] = []) => {
  const original = normalizeUrl(inputUrl);
  if (!original) return { url: '', linkVerified: false, linkStatus: null, linkBlockedReason: 'invalid_url' };
  try {
    const res = await fetch(original, { headers: { 'User-Agent': DEFAULT_UA, Accept: 'text/html,application/xhtml+xml' }, redirect: 'follow' });
    if (!res.ok) return { url: '', linkVerified: false, linkStatus: res.status, linkBlockedReason: res.status === 404 ? 'not_found' : 'blocked' };
    const html = await res.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    if (/404|not found|403|forbidden|captcha|subscribe to continue|paywall/i.test(text.slice(0, 4000))) {
      return { url: '', linkVerified: false, linkStatus: res.status, linkBlockedReason: res.status === 404 ? 'not_found' : 'blocked' };
    }
    const matched = hints.filter(Boolean).map((hint) => hint.toLowerCase()).some((hint) => hint.length < 6 || text.includes(hint.slice(0, Math.min(80, hint.length))));
    if (!matched && hints.filter(Boolean).length > 0) {
      return { url: '', linkVerified: false, linkStatus: res.status, linkBlockedReason: 'content_mismatch' };
    }
    return { url: normalizeUrl(res.url || original), linkVerified: true, linkStatus: res.status, linkBlockedReason: null };
  } catch {
    return { url: '', linkVerified: false, linkStatus: null, linkBlockedReason: 'unreachable' };
  }
};

const parseJson = (content: string) => {
  const cleaned = sanitizeJson(content);
  const fixTrailing = (s: string) => s.replace(/,\s*([}\]])/g, '$1');
  
  try { return JSON.parse(fixTrailing(cleaned)); } catch {}
  
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
  
  const end = cleaned.lastIndexOf('}');
  if (s >= 0 && end > s) {
    try { return JSON.parse(fixTrailing(cleaned.slice(s, end + 1))); } catch {}
  }

  // Repair truncated JSON
  if (s >= 0) {
    let repaired = cleaned.slice(s);
    const lastCloseBrace = repaired.lastIndexOf('}');
    if (lastCloseBrace > 0) {
      repaired = repaired.slice(0, lastCloseBrace + 1);
      let openBraces = 0, openBrackets = 0;
      let inS = false, isEsc = false;
      for (const ch of repaired) {
        if (isEsc) { isEsc = false; continue; }
        if (ch === '\\') { isEsc = true; continue; }
        if (ch === '"') { inS = !inS; continue; }
        if (inS) continue;
        if (ch === '{') openBraces++;
        if (ch === '}') openBraces--;
        if (ch === '[') openBrackets++;
        if (ch === ']') openBrackets--;
      }
      repaired += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
      try { 
        console.warn('Repaired truncated JSON successfully');
        return JSON.parse(fixTrailing(repaired));
      } catch {}
    }
  }
  
  throw new Error('JSON parse failed');
};

const callAi = async (apiKey: string, model: string, system: string, user: string, maxTokens: number, temp: number, retries = 2): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const body: any = {
        model, 
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_object' }, 
        temperature: temp,
      };
      
      // For pro/thinking models, use max_completion_tokens with thinking budget
      if (model.includes('-pro') || model.includes('reasoning')) {
        body.max_completion_tokens = maxTokens + 8000; // extra room for thinking
        body.thinking = { type: 'enabled', budget_tokens: 4000 }; // cap thinking
      } else {
        body.max_tokens = maxTokens;
      }
      
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const respBody = await res.text();
        console.error(`AI HTTP ${res.status} (attempt ${attempt}): ${respBody.slice(0, 500)}`);
        if (attempt < retries) continue;
        throw new Error(`AI ${res.status}`);
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      const finishReason = data?.choices?.[0]?.finish_reason;
      if (!text) {
        console.error(`Empty AI response (attempt ${attempt}), finish: ${finishReason}`);
        if (attempt < retries) continue;
        throw new Error('Empty AI response');
      }
      if (finishReason === 'length') {
        console.warn(`AI response truncated (attempt ${attempt})`);
      }
      console.log(`AI ok (attempt ${attempt}): ${text.length} chars, finish: ${finishReason}`);
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

const MOTOR_BATCH_PROMPT = (batchIdx: number, oemFocus: string) => `글로벌 EV/HEV 파워트레인 데이터 전문가. JSON으로 답해라.
{"motorSpecs":[{"year":"","oem":"","model":"","powertrain":"BEV|PHEV|MHEV|HEV","motorPosition":"P0~P4","segment":"","priceUsd":"","motorSupplier":"","torqueVehicle":"","torqueMotor":"","powerKw":"","maxSpeedRpm":"","rangeKm":"","notable":""}]}

규칙:
- 정확히 20개 차종. ${oemFocus}
- powertrain: BEV/PHEV/MHEV/HEV 중 택1. 필수.
- motorPosition: BEV싱글→P3, 듀얼→P3+P4, PHEV→P2, MHEV→P0, HEV→P2. 필수.

⚠️ torqueVehicle vs torqueMotor 구분 (매우 중요):
- torqueVehicle: 바퀴(Wheel)에서의 토크 Nm. = 모터 토크 × 감속비. 제조사 공식 "최대 토크" 또는 "시스템 토크"로 표기된 수치. 일반적으로 모터 토크보다 5~12배 크다.
  예시: Tesla Model 3 RWD → 약 3,500 Nm (wheel), IONIQ 5 RWD → 약 2,700 Nm (wheel)
- torqueMotor: 모터 축(Shaft)에서의 단독 토크 Nm. 감속기 전 수치. 듀얼 모터는 앞/뒤 슬래시(예: 255/350).
  예시: Tesla Model 3 RWD 모터 → 약 340 Nm, IONIQ 5 RWD 모터 → 약 350 Nm
- ❌ 두 값이 동일할 수 없음! 감속기(7~12:1 기어비)가 있으므로 반드시 다른 값.
- 제조사가 "최대 토크 350 Nm"라고만 공개한 경우: torqueMotor에 350, torqueVehicle에는 "-" (역산 금지).
- 제조사가 "wheel torque" 또는 "시스템 토크"로 별도 공개한 경우만 torqueVehicle에 기입.

- powerKw: 모터 출력 kW. 시스템 최대 출력. 듀얼이면 합산.
- maxSpeedRpm: 구동 모터 최대 회전수 rpm. 제조사 공식 스펙시트 기준만. OEM이 비공개인 경우 반드시 "-".
- rangeKm: BEV는 WLTP/EPA km. HEV/MHEV는 반드시 "-".
- motorSupplier: 모터 제조사/공급사. 자체 생산이면 해당 OEM명.
- priceUsd: 미국 기준 MSRP USD. 미판매 시 "-".
- notable: 핵심 기술 특징 10자 이내.
- 모르는 수치는 반드시 "-". "정보 없음" 금지.
- 실제 양산/출시된 차종만. 컨셉카 제외.`;

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

    const { data: newsData } = await supabase.from('news').select('*').order('date', { ascending: false }).limit(60);
    if (!newsData?.length) {
      return new Response(JSON.stringify({ error: 'No news data' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const newsBrief = newsData.map(a => `[${a.category?.join(',')}] ${a.title_kr} (${a.source}, ${a.date})`).join('\n');

    // Fetch existing specs for smart merge
    const { data: existingRow } = await supabase.from('market_analysis').select('content').eq('type', 'dashboard_v2').maybeSingle();
    const existingSpecs: any[] = (existingRow?.content as any)?.motorSpecs || [];

    console.log(`Starting. Existing specs: ${existingSpecs.length}, news: ${newsData.length}`);

    // 1) Overview (wordcloud + roadmap) — flash is fine for this
    const overviewPrompt = `EV 모터 기술 애널리스트. JSON만 답해라.
{
  "wordCloud": [{"text":"키워드","value":1}],
  "roadmap": {
    "prm": [{"year":"2024","category":"카테고리","title":"제목","description":"설명","status":"past|current|future","highApplicability":true,"sources":[{"title":"출처 제목","description":"한줄 설명","url":"https://...또는 빈문자열"}]}],
    "trm": [{"year":"2024","category":"카테고리","title":"제목","description":"설명","status":"past|current|future","highApplicability":true,"sources":[{"title":"출처 제목","description":"한줄 설명","url":"https://...또는 빈문자열"}]}]
  }
}
wordCloud: EV 모터 기술 키워드 20~30개. 영어 기술 용어는 반드시 영어 그대로 출력(예: "Hairpin Winding", "SiC MOSFET", "Axial Flux"). 한글 번역 금지.

⚠️ PRM/TRM은 전기자동차 **구동 모터(Traction Motor)** 기술에만 집중. 인버터, 배터리, BMS, 충전, 자율주행 등 비모터 기술은 절대 포함 금지.

PRM 20개 이상: 모터 아키텍처(IPMSM→EESM→Axial Flux), 800V 모터 설계, 멀티스피드 감속기, X-in-1 e-Axle 통합, 듀얼/트리플 모터 등. 2024~2035년 범위.
TRM 35개 이상: Stator Core(NO Steel→Amorphous), Hairpin Winding(I-pin→Continuous), Rotor Magnet(NdFeB→Dy-free→Ferrite), Cooling(Oil Spray→Direct Slot), Resolver→Inductive Encoder, Lamination(0.3mm→0.2mm→0.1mm), Busbar(Cu→Al→Flexible PCB), Housing(Al Cast→CFRP), Insulation(Class H→Class R), Bearing(Steel→Ceramic→Mag), Sealing(Lip→Labyrinth→Mag), Connector(HV Cu→Al), NVH(Skew→Active Noise Cancel), EMC Shielding, Thermal Interface Material, Winding End-Turn 최적화 등. 2024~2035년 범위.
status: 2024이전 past, 2024-2025 current, 2026+ future.

highApplicability: 전기자동차 모터에 실제 적용 가능성이 높고 업계에서 활발히 개발/양산 중인 기술이면 true. 장기적이거나 실험 단계인 기술은 false.

⚠️ sources 규칙 (매우 중요):
- 각 로드맵 항목마다 sources 배열에 2~4개의 참고 출처를 포함.
- 각 source는 title(출처 제목), description(한줄 요약), url(원본 링크) 필드 포함.
- url은 IEEE, SAE, OEM 공식 보도자료, 학술 논문, 신뢰할 수 있는 업계 기사 등의 실제 접근 가능한 URL.
- ⚠️ 403, 404, 페이월(Paywall), 봇 차단 등으로 실제 접근이 불가능한 URL은 절대 포함하지 마라. 이런 경우 url을 빈 문자열("")로 설정하고 title과 description만 제공.
- URL을 확신할 수 없으면 url을 ""로 두고 title과 description으로 출처 정보를 전달.
- AI 내부 지식 기반 정보도 출처로 포함 가능: title에 자료명, description에 핵심 내용 요약, url은 "".`;

    // 2) Motor specs — 3 batches of 20, using pro model for accuracy
    const oemBatches = [
      '2024-2025 Hyundai/Kia/Genesis 중심: IONIQ 5 N, IONIQ 5, IONIQ 6, EV3, EV5, EV6, EV6 GT, EV9, Kona Electric, Niro EV, GV60, GV70 Electrified, G80 Electrified, Tucson HEV, Santa Fe HEV, Sorento HEV, Sportage HEV, K8 HEV, K5 HEV, Grandeur HEV.',
      '2024-2026 Tesla/BMW/Mercedes/VW/Audi/Porsche 중심: Model 3, Model Y, Model S, Cybertruck, iX, i4, i5, iX1, EQS, EQE, EQA, EQB, ID.4, ID.7, ID.Buzz, Q6 e-tron, Macan Electric, Taycan.',
      '2024-2026 Toyota/BYD/Rivian/Lucid/GM/Ford/Volvo/Polestar/Nissan/Honda 중심: bZ4X, bZ3, Seal, Atto 3, Han EV, R1T, R1S, Air, Lyriq, Blazer EV, Equinox EV, Mustang Mach-E, F-150 Lightning, EX30, EX90, Polestar 2, Ariya, Prologue.',
    ];

    // Run overview + first motor batch in parallel
    const [overviewData, batch1] = await Promise.all([
      callAi(apiKey, 'google/gemini-2.5-flash', overviewPrompt, `최근 뉴스 ${newsData.length}건:\n${newsBrief}`, 8000, 0.4),
      callAi(apiKey, 'google/gemini-2.5-flash', MOTOR_BATCH_PROMPT(1, oemBatches[0]), `최근 뉴스 참고:\n${newsBrief.slice(0, 1500)}`, 8000, 0.1),
    ]);

    console.log(`Overview done. Batch 1: ${batch1?.motorSpecs?.length || 0} specs`);

    // Run batch 2 and 3 in parallel
    const [batch2, batch3] = await Promise.all([
      callAi(apiKey, 'google/gemini-2.5-flash', MOTOR_BATCH_PROMPT(2, oemBatches[1]), `최근 뉴스 참고:\n${newsBrief.slice(0, 1500)}`, 8000, 0.1),
      callAi(apiKey, 'google/gemini-2.5-flash', MOTOR_BATCH_PROMPT(3, oemBatches[2]), `최근 뉴스 참고:\n${newsBrief.slice(0, 1500)}`, 8000, 0.1),
    ]);

    console.log(`Batch 2 raw keys: ${batch2 ? Object.keys(batch2).join(',') : 'null'}, Batch 3: ${batch3?.motorSpecs?.length || 0}`);
    console.log(`Batch 2 snippet: ${JSON.stringify(batch2).slice(0, 300)}`);

    // Extract motorSpecs from response — handle different key names
    const extractSpecs = (resp: any): any[] => {
      if (!resp) return [];
      if (Array.isArray(resp)) return resp;
      if (Array.isArray(resp.motorSpecs)) return resp.motorSpecs;
      if (Array.isArray(resp.motor_specs)) return resp.motor_specs;
      if (Array.isArray(resp.specs)) return resp.specs;
      if (Array.isArray(resp.vehicles)) return resp.vehicles;
      if (Array.isArray(resp.data)) return resp.data;
      // Check for numeric keys (array-like object)
      const keys = Object.keys(resp);
      if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
        console.log(`Array-like object with ${keys.length} numeric keys`);
        return keys.map(k => resp[k]).filter(v => v && typeof v === 'object');
      }
      // Look for the first array value in the response
      for (const key of keys) {
        if (Array.isArray(resp[key]) && resp[key].length > 0 && typeof resp[key][0] === 'object') {
          console.log(`Found specs under key "${key}" (${resp[key].length} items)`);
          return resp[key];
        }
      }
      return [];
    };

    // Merge all new specs, then smart-merge with existing
    const allNewSpecs = [
      ...extractSpecs(batch1),
      ...extractSpecs(batch2),
      ...extractSpecs(batch3),
    ];
    
    // Put new specs first so they take priority, but mergeSpecs preserves non-'-' from old
    const combined = [...allNewSpecs, ...existingSpecs];
    const finalSpecs = dedupeAndMergeSpecs(combined).slice(0, 300);

    // Count quality metrics
    const filled = (field: string) => finalSpecs.filter((s: any) => s[field] && s[field] !== '-').length;
    console.log(`Quality: torqueVehicle=${filled('torqueVehicle')}, torqueMotor=${filled('torqueMotor')}, torqueNm=${filled('torqueNm')}, maxSpeedRpm=${filled('maxSpeedRpm')}, motorSupplier=${filled('motorSupplier')}, powerKw=${filled('powerKw')}`);

    const verifyRoadmapItems = async (items: any[] = []) => Promise.all(items.map(async (item) => ({
      ...item,
      sources: await Promise.all(((item?.sources || []) as any[]).map(async (source) => {
        if (!source?.url) {
          return { ...source, url: '', linkVerified: false, linkStatus: null, linkBlockedReason: source?.description ? 'blocked' : 'invalid_url' };
        }
        const verified = await verifyExternalLink(source.url, [source.title || item?.title || '', source.description || '']);
        return {
          ...source,
          url: verified.linkVerified ? verified.url : '',
          linkVerified: verified.linkVerified,
          linkStatus: verified.linkStatus,
          linkBlockedReason: verified.linkBlockedReason,
        };
      })),
    })));

    const verifiedPrm = await verifyRoadmapItems(Array.isArray(overviewData?.roadmap?.prm) ? overviewData.roadmap.prm : []);
    const verifiedTrm = await verifyRoadmapItems(Array.isArray(overviewData?.roadmap?.trm) ? overviewData.roadmap.trm : []);

    const dashboard = {
      wordCloud: Array.isArray(overviewData?.wordCloud) ? overviewData.wordCloud : [],
      roadmap: {
        prm: verifiedPrm,
        trm: verifiedTrm,
      },
      motorSpecs: finalSpecs,
    };

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

    console.log(`Done: ${finalSpecs.length} specs, ${dashboard.roadmap.prm.length} PRM, ${dashboard.roadmap.trm.length} TRM, ${dashboard.wordCloud.length} keywords`);

    return new Response(JSON.stringify({ 
      success: true, 
      specs: finalSpecs.length,
      newSpecs: allNewSpecs.length,
      prm: dashboard.roadmap.prm.length,
      trm: dashboard.roadmap.trm.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
