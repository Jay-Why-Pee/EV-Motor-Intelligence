import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MotorSpecRow {
  year: string;
  oem: string;
  model: string;
  powertrain: string;
  motorPosition: string;
  segment: string;
  priceUsd: string;
  motorSupplier: string;
  torqueNm: string;
  powerKw: string;
  maxSpeedRpm: string;
  rangeKm: string;
  notable: string;
  dataGapReason?: string[];
}

const missingTokens = new Set(['', '-', '정보 없음', '없음', '미확인', 'n/a', 'na', 'unknown']);
const allowedPowertrains = new Set(['BEV', 'PHEV', 'MHEV', 'HEV']);

const pickField = (raw: any, keys: string[]): unknown => {
  for (const key of keys) {
    const value = raw?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
};

const normalizeField = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  if (missingTokens.has(text.toLowerCase())) return '-';
  return text;
};

const normalizePowertrain = (value: unknown): string => {
  const text = normalizeField(value);
  if (text === '-') return '-';

  const upper = text.toUpperCase().replace(/\s+/g, '');
  if (allowedPowertrains.has(upper)) return upper;
  if (upper.includes('PHEV') || /plug[-\s]?in/i.test(text)) return 'PHEV';
  if (upper.includes('MHEV') || /mild\s*hybrid|48v|bsg/i.test(text)) return 'MHEV';
  if (upper.includes('HEV') || /hybrid|하이브리드/i.test(text)) return 'HEV';
  if (upper.includes('BEV') || /battery\s*electric|순수\s*전기|전기차/i.test(text)) return 'BEV';
  return '-';
};

const inferPowertrainFromRaw = (raw: any): string => {
  const context = [
    raw?.powertrain,
    raw?.fuelType,
    raw?.model,
    raw?.segment,
    raw?.notable,
  ].filter(Boolean).join(' ').toLowerCase();

  if (/\bphev\b|plug[-\s]?in/.test(context)) return 'PHEV';
  if (/\bmhev\b|mild\s*hybrid|48v|bsg/.test(context)) return 'MHEV';
  if (/\bhev\b|full\s*hybrid|self\s*charging\s*hybrid|하이브리드/.test(context)) return 'HEV';
  if (/\bbev\b|battery\s*electric|순수\s*전기|전기차/.test(context)) return 'BEV';
  return '-';
};

const normalizeMotorPosition = (value: unknown, powertrain: string, raw: any): string => {
  const text = normalizeField(value);
  if (text !== '-') {
    const normalized = text.toUpperCase().replace(/\s+/g, '');
    const match = normalized.match(/^P[0-4](\+P[0-4])*$/);
    if (match) return match[0];
  }

  const context = [raw?.model, raw?.notable, raw?.drivetrain].filter(Boolean).join(' ').toLowerCase();

  if (powertrain === 'BEV') {
    if (/tri[-\s]?motor|triple|3[-\s]?motor/.test(context)) return 'P3+P4+P4';
    if (/dual[-\s]?motor|awd|all[-\s]?wheel|4wd|사륜|e-four/.test(context)) return 'P3+P4';
    return 'P3';
  }
  if (powertrain === 'PHEV') {
    return /awd|all[-\s]?wheel|4wd|dual|e-four|사륜/.test(context) ? 'P2+P4' : 'P2';
  }
  if (powertrain === 'MHEV') return 'P0';
  if (powertrain === 'HEV') return /isg|bsg|belt/.test(context) ? 'P1' : 'P2';
  return '-';
};

const extractRangeKm = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  const text = String(value);
  const matches = text.match(/\d{2,4}/g);
  if (!matches?.length) return '-';
  const nums = matches.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n) && n >= 20 && n <= 1200);
  if (!nums.length) return '-';
  return String(Math.max(...nums));
};

const normalizeRangeKm = (value: unknown, powertrain: string, raw: any): string => {
  const direct = extractRangeKm(value);
  if (direct !== '-') return direct;

  const aliased = extractRangeKm(pickField(raw, ['range', 'range_km', 'wltpKm', 'epaKm', 'evRangeKm', 'electricRangeKm']));
  if (aliased !== '-') return aliased;

  if (powertrain === 'HEV' || powertrain === 'MHEV') return '-';
  return '-';
};

const normalizeMotorSpec = (raw: any): MotorSpecRow => ({
  ...(() => {
    const year = normalizeField(pickField(raw, ['year', 'launchYear', 'releaseYear']));
    const oem = normalizeField(pickField(raw, ['oem', 'brand', 'maker', 'manufacturer']));
    const model = normalizeField(pickField(raw, ['model', 'vehicle', 'modelName', 'name']));
    const powertrain = normalizePowertrain(pickField(raw, ['powertrain', 'powerTrain', 'fuelType', 'vehicleType'])) === '-'
      ? inferPowertrainFromRaw(raw)
      : normalizePowertrain(pickField(raw, ['powertrain', 'powerTrain', 'fuelType', 'vehicleType']));
    const motorPosition = normalizeMotorPosition(
      pickField(raw, ['motorPosition', 'motor_position', 'motorLayout', 'position']),
      powertrain,
      raw,
    );
    const rangeKm = normalizeRangeKm(
      pickField(raw, ['rangeKm', 'range_km', 'evRange', 'electricRange']),
      powertrain,
      raw,
    );

    const dataGapReason: string[] = [];
    if (powertrain === '-') dataGapReason.push('파워트레인 분류의 공식 공개자료를 찾지 못함');
    if (motorPosition === '-') dataGapReason.push('모터 위치(P단) 공개자료를 찾지 못함');
    if (rangeKm === '-') {
      if (powertrain === 'HEV' || powertrain === 'MHEV') {
        dataGapReason.push('HEV/MHEV는 EV 모드 공식 주행거리(km)를 제공하지 않는 경우가 많음');
      } else {
        dataGapReason.push('공식 WLTP/EPA 주행거리 수치가 공개되지 않았거나 시장별 수치가 상이함');
      }
    }

    return {
      year,
      oem,
      model,
      powertrain,
      motorPosition,
      segment: normalizeField(raw?.segment),
      priceUsd: normalizeField(raw?.priceUsd),
      motorSupplier: normalizeField(raw?.motorSupplier),
      torqueNm: normalizeField(raw?.torqueNm),
      powerKw: normalizeField(raw?.powerKw),
      maxSpeedRpm: normalizeField(raw?.maxSpeedRpm),
      rangeKm,
      notable: normalizeField(raw?.notable),
      dataGapReason: dataGapReason.length ? dataGapReason : undefined,
    };
  })(),
});

const dedupeAndSortMotorSpecs = (specs: any[]): MotorSpecRow[] => {
  const map = new Map<string, MotorSpecRow>();

  for (const raw of specs) {
    const spec = normalizeMotorSpec(raw);
    if (spec.oem === '-' || spec.model === '-') continue;
    const key = `${spec.oem.toLowerCase()}::${spec.model.toLowerCase()}::${spec.powertrain.toLowerCase()}`;
    if (!map.has(key)) map.set(key, spec);
  }

  return [...map.values()].sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0)).slice(0, 300);
};

const sanitizeJsonText = (content: string): string =>
  content
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .replace(/\u0000/g, '')
    .trim();

const extractBalancedJsonObject = (input: string): string | null => {
  const start = input.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  return null;
};

const tryParseJson = (jsonText: string) => {
  const withoutTrailingCommas = jsonText.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(withoutTrailingCommas);
};

const parseJsonFromModel = (content: string) => {
  const cleaned = sanitizeJsonText(content);

  try {
    return tryParseJson(cleaned);
  } catch {
    const balanced = extractBalancedJsonObject(cleaned);
    if (balanced) {
      try {
        return tryParseJson(balanced);
      } catch {
        // fallback below
      }
    }

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return tryParseJson(cleaned.slice(firstBrace, lastBrace + 1));
    }

    throw new Error('AI 응답 JSON 파싱 실패');
  }
};

class AiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const callAiJson = async ({
  lovableApiKey,
  model,
  messages,
  maxTokens,
  temperature,
  retries = 1,
}: {
  lovableApiKey: string;
  model: string;
  messages: AiMessage[];
  maxTokens: number;
  temperature: number;
  retries?: number;
}) => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      if (res.status === 429 || res.status === 402) {
        throw new AiRequestError(res.status, `AI error: ${res.status}`);
      }

      lastError = new AiRequestError(res.status, `AI error: ${res.status}`);
      if (attempt >= retries) throw lastError;
      continue;
    }

    const aiData = await res.json();
    const content = aiData?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      lastError = new Error('AI 응답이 비어있습니다');
      if (attempt >= retries) throw lastError;
      continue;
    }

    try {
      return parseJsonFromModel(content);
    } catch (parseError) {
      lastError = parseError;
      if (attempt >= retries) throw parseError;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI 요청 실패');
};

const needsCriticalFieldBackfill = (spec: MotorSpecRow): boolean =>
  spec.powertrain === '-'
  || spec.motorPosition === '-'
  || ((spec.powertrain === 'BEV' || spec.powertrain === 'PHEV') && spec.rangeKm === '-');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const apikeyHeader = req.headers.get('apikey') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader?.replace('Bearer ', '') || '';
  const authorized = token === anonKey || token === serviceKey || apikeyHeader === anonKey || apikeyHeader === serviceKey;
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: newsData } = await supabase
      .from('news')
      .select('*')
      .order('date', { ascending: false })
      .limit(180);

    if (!newsData?.length) {
      return new Response(JSON.stringify({ error: '분석할 뉴스 데이터가 없습니다' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const newsSummary = newsData.map(a =>
      `[${a.category?.join(', ')}] ${a.title_kr}\n${String(a.summary || '').slice(0, 180)}\n출처: ${a.source} (${a.date})`
    ).join('\n\n');

    const overviewPrompt = `당신은 EV 모터 기술 리서치 애널리스트다. 아래 JSON으로만 답해라.
{
  "wordCloud": [{ "text": "키워드", "value": 1 }],
  "roadmap": {
    "prm": [{ "year": "2024", "category": "카테고리", "title": "제목", "description": "설명", "status": "past|current|future" }],
    "trm": [{ "year": "2024", "category": "카테고리", "title": "제목", "description": "설명", "status": "past|current|future" }]
  }
}

규칙:
1) wordCloud는 EV 모터 세부 기술 키워드 20~30개만.
2) PRM 12~20개: EV 모터 제품/아키텍처 중심.
3) TRM 24~32개: Stator Core, Winding, Rotor, Magnet, Cooling, Bearing, Inverter, Resolver, Lamination, Busbar, Housing, Insulation, Sealing 등 부품 기술 상세.
4) status: 2024 이전 past, 2024~2025 current, 2026 이후 future.`;

    const motorSpecsPrompt = `당신은 글로벌 EV/HEV 파워트레인 스펙 데이터 리서처다. 아래 JSON으로만 답해라.
{
  "motorSpecs": [
    {
      "year": "출시연도",
      "oem": "완성차 제조사",
      "model": "차종명",
      "powertrain": "BEV|PHEV|MHEV|HEV",
      "motorPosition": "P0|P1|P2|P3|P4|복합(P2+P4 등)",
      "segment": "세그먼트",
      "priceUsd": "가격 USD 숫자",
      "motorSupplier": "모터 공급사",
      "torqueNm": "토크 Nm 숫자",
      "powerKw": "출력 kW 숫자",
      "maxSpeedRpm": "최대속도 rpm 숫자",
      "rangeKm": "공식 주행가능거리 km 숫자",
      "notable": "주목 기술"
    }
  ]
}

핵심 규칙:
- 최대 300개까지 글로벌 차종을 채운다(최소 220개).
- powertrain은 반드시 BEV/PHEV/MHEV/HEV 중 하나.
- motorPosition은 가능한 한 반드시 기입한다(BEV 싱글→P3, BEV 듀얼→P3+P4, PHEV→P2, MHEV→P0 기본 매핑).
- rangeKm는 BEV/PHEV는 우선적으로 채운다. 공식 검증 수치가 없을 때만 "-" 허용.
- "정보 없음" 문자열 금지, 불가 시 "-"만 사용.
- 2025년 Hyundai/Kia/Genesis EV/HEV/PHEV 라인업을 특히 촘촘히 포함한다(예: IONIQ 5/6, Kona Electric, EV3/EV4/EV5/EV6/EV9, GV60, Electrified GV70/G80, Tucson/Santa Fe/Sorento/Sportage HEV/PHEV 등 관련 트림 포함).
- 중복 금지, year 내림차순.
- 듀얼 모터 토크/출력은 슬래시 구분.`;

    const [overviewData, motorBaseData] = await Promise.all([
      callAiJson({
        lovableApiKey,
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: overviewPrompt },
          { role: 'user', content: `=== 최근 뉴스 (${newsData.length}건) ===\n${newsSummary}` },
        ],
        temperature: 0.4,
        maxTokens: 9000,
        retries: 1,
      }),
      callAiJson({
        lovableApiKey,
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: motorSpecsPrompt },
          { role: 'user', content: `=== 최근 뉴스 (${newsData.length}건) ===\n${newsSummary}` },
        ],
        temperature: 0.2,
        maxTokens: 18000,
        retries: 1,
      }),
    ]);

    const dashboardData: any = {
      wordCloud: Array.isArray(overviewData?.wordCloud) ? overviewData.wordCloud : [],
      roadmap: {
        prm: Array.isArray(overviewData?.roadmap?.prm) ? overviewData.roadmap.prm : [],
        trm: Array.isArray(overviewData?.roadmap?.trm) ? overviewData.roadmap.trm : [],
      },
      motorSpecs: [],
    };

    let mergedMotorSpecs = Array.isArray(motorBaseData?.motorSpecs) ? motorBaseData.motorSpecs : [];

    if (mergedMotorSpecs.length < 260) {
      try {
        const existingModels = mergedMotorSpecs.map((s: any) => `${s.oem}::${s.model}`).join(', ');
        const supplementJson = await callAiJson({
          lovableApiKey,
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'system',
              content: `누락된 글로벌 EV/HEV/PHEV/MHEV 차종을 보강하라. 반드시 {"motorSpecs":[...]} JSON만 응답.
- powertrain은 BEV/PHEV/MHEV/HEV 중 하나 필수
- motorPosition 필수(불가 시에만 '-')
- rangeKm는 BEV/PHEV 우선 기입
- 중복 금지, 연도 내림차순`,
            },
            {
              role: 'user',
              content: `이미 포함된 차종: ${existingModels}\n\n누락된 글로벌 차종을 최대한 추가해줘.`,
            },
          ],
          temperature: 0.2,
          maxTokens: 12000,
          retries: 1,
        });

        if (supplementJson) {
          const supplementSpecs = Array.isArray(supplementJson.motorSpecs) ? supplementJson.motorSpecs : [];
          mergedMotorSpecs = [...mergedMotorSpecs, ...supplementSpecs];
        }
      } catch (supplementError) {
        console.error('Supplement motor specs generation failed:', supplementError);
      }
    }

    const normalizedBeforeCoverage = dedupeAndSortMotorSpecs(mergedMotorSpecs);
    const hyundaiGroup2025Count = normalizedBeforeCoverage.filter((spec) =>
      spec.year === '2025' && /(hyundai|kia|genesis)/i.test(spec.oem)
    ).length;

    if (hyundaiGroup2025Count < 12) {
      try {
        const hyundaiBoost = await callAiJson({
          lovableApiKey,
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'system',
              content: `2025년 Hyundai/Kia/Genesis EV/HEV/PHEV 라인업을 보강하라.
응답 형식: {"motorSpecs":[...]} JSON만.
필수: powertrain, motorPosition, rangeKm(BEV/PHEV 우선), year=2025 중심.`,
            },
            {
              role: 'user',
              content: '2025년 Hyundai/Kia/Genesis 차종을 가능한 많이 추가해줘. EV 및 HEV/PHEV 모두 포함.',
            },
          ],
          temperature: 0.15,
          maxTokens: 8000,
          retries: 1,
        });

        if (Array.isArray(hyundaiBoost?.motorSpecs)) {
          mergedMotorSpecs = [...mergedMotorSpecs, ...hyundaiBoost.motorSpecs];
        }
      } catch (coverageError) {
        console.error('Hyundai 2025 coverage boost failed:', coverageError);
      }
    }

    let normalizedMotorSpecs = dedupeAndSortMotorSpecs(mergedMotorSpecs);

    const missingCriticalRows = normalizedMotorSpecs
      .map((spec, index) => ({ index, spec }))
      .filter(({ spec }) => needsCriticalFieldBackfill(spec));

    if (missingCriticalRows.length > 0) {
      try {
        const backfillInput = missingCriticalRows.slice(0, 180).map(({ index, spec }) => ({
          index,
          year: spec.year,
          oem: spec.oem,
          model: spec.model,
          powertrain: spec.powertrain,
          motorPosition: spec.motorPosition,
          rangeKm: spec.rangeKm,
          notable: spec.notable,
        }));

        const backfillJson = await callAiJson({
          lovableApiKey,
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'system',
              content: `아래 누락 행의 핵심 필드만 보강하라. JSON 형식:
{
  "fills": [
    { "index": 0, "powertrain": "BEV|PHEV|MHEV|HEV|-", "motorPosition": "P0|P1|P2|P3|P4|복합|-", "rangeKm": "숫자|-", "reason": "짧은 근거" }
  ]
}
규칙:
- 확신 없으면 '-' 유지
- BEV/PHEV는 가능한 공식 공개 수치 범위로 rangeKm 보강
- HEV/MHEV는 rangeKm '-' 허용
- 절대 "정보 없음" 사용 금지`,
            },
            {
              role: 'user',
              content: JSON.stringify(backfillInput),
            },
          ],
          temperature: 0.1,
          maxTokens: 10000,
          retries: 1,
        });

        const fills = Array.isArray(backfillJson?.fills) ? backfillJson.fills : [];
        for (const fill of fills) {
          const idx = typeof fill?.index === 'number' ? fill.index : -1;
          if (idx < 0 || idx >= normalizedMotorSpecs.length) continue;

          normalizedMotorSpecs[idx] = normalizeMotorSpec({
            ...normalizedMotorSpecs[idx],
            powertrain: fill?.powertrain ?? normalizedMotorSpecs[idx].powertrain,
            motorPosition: fill?.motorPosition ?? normalizedMotorSpecs[idx].motorPosition,
            rangeKm: fill?.rangeKm ?? normalizedMotorSpecs[idx].rangeKm,
            notable: normalizedMotorSpecs[idx].notable,
          });
        }
      } catch (backfillError) {
        console.error('Critical field backfill failed:', backfillError);
      }
    }

    dashboardData.motorSpecs = dedupeAndSortMotorSpecs(normalizedMotorSpecs);
    dashboardData.motorSpecsQuality = {
      total: dashboardData.motorSpecs.length,
      missingPowertrain: dashboardData.motorSpecs.filter((s: MotorSpecRow) => s.powertrain === '-').length,
      missingMotorPosition: dashboardData.motorSpecs.filter((s: MotorSpecRow) => s.motorPosition === '-').length,
      missingRangeKm: dashboardData.motorSpecs.filter((s: MotorSpecRow) => s.rangeKm === '-').length,
      dashPolicy: '공식 스펙 문서(WLTP/EPA/OEM 발표)로 검증 불가한 경우에만 "-" 허용',
    };

    const { data: existing } = await supabase.from('market_analysis').select('id').eq('type', 'dashboard_v2').maybeSingle();
    if (existing) {
      await supabase.from('market_analysis').update({
        content: dashboardData,
        news_analyzed_count: newsData.length,
        generated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('market_analysis').insert({
        type: 'dashboard_v2',
        content: dashboardData,
        news_analyzed_count: newsData.length,
        generated_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify(dashboardData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof AiRequestError && error.status === 429) {
      return new Response(JSON.stringify({ error: '요청 한도 초과. 잠시 후 다시 시도해주세요.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (error instanceof AiRequestError && error.status === 402) {
      return new Response(JSON.stringify({ error: '크레딧 부족.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
