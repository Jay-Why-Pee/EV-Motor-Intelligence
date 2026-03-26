import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
}

const missingTokens = new Set(['', '-', '정보 없음', '없음', '미확인', 'n/a', 'na', 'unknown']);

const normalizeField = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  if (missingTokens.has(text.toLowerCase())) return '-';
  return text;
};

const normalizeMotorSpec = (raw: any): MotorSpecRow => ({
  year: normalizeField(raw?.year),
  oem: normalizeField(raw?.oem),
  model: normalizeField(raw?.model),
  powertrain: normalizeField(raw?.powertrain),
  motorPosition: normalizeField(raw?.motorPosition),
  segment: normalizeField(raw?.segment),
  priceUsd: normalizeField(raw?.priceUsd),
  motorSupplier: normalizeField(raw?.motorSupplier),
  torqueNm: normalizeField(raw?.torqueNm),
  powerKw: normalizeField(raw?.powerKw),
  maxSpeedRpm: normalizeField(raw?.maxSpeedRpm),
  rangeKm: normalizeField(raw?.rangeKm),
  notable: normalizeField(raw?.notable),
});

const dedupeAndSortMotorSpecs = (specs: any[]): MotorSpecRow[] => {
  const map = new Map<string, MotorSpecRow>();

  for (const raw of specs) {
    const spec = normalizeMotorSpec(raw);
    if (spec.oem === '-' || spec.model === '-') continue;
    const key = `${spec.oem.toLowerCase()}::${spec.model.toLowerCase()}`;
    if (!map.has(key)) map.set(key, spec);
  }

  return [...map.values()].sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
};

const parseJsonFromModel = (content: string) => {
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/{[\s\S]*}/);
    if (!match) throw new Error('AI 응답 JSON 파싱 실패');
    return JSON.parse(match[0]);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader?.replace('Bearer ', '') || '';
  if (!authHeader || (token !== anonKey && token !== serviceKey)) {
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
      .limit(100);

    if (!newsData?.length) {
      return new Response(JSON.stringify({ error: '분석할 뉴스 데이터가 없습니다' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const newsSummary = newsData.map(a =>
      `[${a.category?.join(', ')}] ${a.title_kr}\n${a.summary}\n출처: ${a.source} (${a.date})`
    ).join('\n\n');

    const systemPrompt = `당신은 전기차 모터 산업 데이터 분석 전문가입니다. 제공된 뉴스 데이터를 기반으로 3가지 섹션의 대시보드 데이터를 생성하세요.

반드시 아래 JSON 구조로 응답하세요:
{
  "wordCloud": [
    { "text": "키워드", "value": 숫자(1~100) }
  ],
  "motorSpecs": [
    {
      "year": "출시연도(예: 2024)",
      "oem": "완성차 제조사",
      "model": "차종명",
      "segment": "세그먼트(B-SUV, D-Sedan 등)",
      "priceUsd": "가격(USD, 숫자만. 예: 42990)",
      "motorSupplier": "모터 공급업체",
      "torqueNm": "모터 최대 토크(Nm, 숫자만)",
      "powerKw": "모터 최대 출력(kW, 숫자만)",
      "maxSpeedRpm": "모터 최대 회전수(rpm, 숫자만)",
      "notable": "주목할 기술 특징"
    }
  ],
  "roadmap": {
    "prm": [
      { "year": "2024", "category": "PMSM|Non-PMSM|P1|P2|P3|P4|BEV|xHEV", "title": "제목", "description": "설명", "status": "past|current|future" }
    ],
    "trm": [
      { "year": "2024", "category": "Stator|Rotor|Winding|Magnet|Cooling|Inverter|Housing|Bearing", "title": "제목", "description": "설명", "status": "past|current|future" }
    ]
  }
}

규칙:
1. wordCloud: 20~30개의 EV 모터 전문 기술 키워드만 포함.
   - 반드시 제외할 단어: EV, 전기차, 배터리, 모터, 소프트웨어, 인버터, 자동차, 하이브리드, 전동화, Electric Vehicle, Battery, Motor, Software, Inverter 등 비기술적 통칭/일반 개념어.
   - 포함할 단어 예시: Hairpin Winding, SiC MOSFET, 800V Architecture, e-Axle, IPMSM, Flat Wire, NdFeB, Ferrite Magnet, Axial Flux, Distributed Winding, Concentrated Winding, Oil Cooling, Water Jacket, Bar Winding, I-pin, Segment Conductor, Dual Rotor, Halbach Array, Reluctance Torque, Back-EMF, GaN, Continuous Casting, Die-cast Copper Rotor 등 구체적 기술 용어만.

2. motorSpecs: 글로벌 주요 완성차 OEM들의 확인 가능한 모든 BEV/HEV/PHEV 차종 정보를 최대한 많이 수집 (최소 80개, 가능하면 120개 이상).
   - 출시연도(year) 내림차순 정렬.
   - 반드시 실제로 공개된/검증된 스펙만 입력. 확인 불가 시 "-"로 표기 (절대 추측하지 말 것, "정보 없음" 문자열 금지).
    - 단위: 가격은 USD 숫자만(예: 42990), 토크는 Nm 숫자만, 출력은 kW 숫자만, 회전수는 rpm 숫자만. 단위 문자열은 절대 포함하지 말 것.
    - 듀얼 모터 차량의 경우: 토크/출력을 슬래시로 구분 표기 (예: 전/후 모터 300Nm/200Nm → "300/200", 150kW/200kW → "150/200"). 단일 모터는 숫자만.
    - 포함 OEM: Tesla, Hyundai, Kia, BMW, Mercedes-Benz, Audi, Porsche, VW, BYD, NIO, Xpeng, Li Auto, Geely/Zeekr, Toyota, Honda, Nissan, Ford, GM/Chevrolet, Rivian, Lucid, Volvo/Polestar, Stellantis, Renault, SAIC, Changan, GAC Aion, Xiaomi 등.
    - 차량의 공식 스펙시트에서 motor max torque(Nm), motor max power(kW), motor max speed(rpm) 정보를 찾아 입력. 차량 레벨 토크/출력이면 notable에 "(차량 레벨)" 표기.
    - 중복 차종은 제거하고 차종명+트림은 명확히 구분.
    - 최소 100개 이상의 차종을 반드시 포함할 것. 누락 없이 가능한 한 모든 BEV/HEV/PHEV 모델을 포함.

3. roadmap:
   - PRM(Product Roadmap): PMSM, Non-PMSM, P1~P4 구동 방식, BEV/xHEV별 제품 발전 방향. 2020~2028 범위. 8~15개 항목.
   - TRM(Technical Roadmap): 모터 부품(Stator, Rotor, Winding, Magnet, Cooling, Inverter 등)별 기술 발전. 2020~2028 범위. 8~15개 항목.
   - status: 2024 이전=past, 2024~2025=current, 2026 이후=future`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `=== 최근 뉴스 (${newsData.length}건) ===\n${newsSummary}\n\n위 데이터를 분석하여 대시보드 데이터를 JSON으로 생성해주세요. motorSpecs는 뉴스에 언급된 차종뿐 아니라 글로벌 주요 완성차의 BEV/HEV/PHEV 전체 라인업을 폭넓게 포함해주세요. 최소 80개 이상, 가능하면 120개 이상 차종을 목표로 하세요.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 20000,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: '요청 한도 초과. 잠시 후 다시 시도해주세요.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (res.status === 402) return new Response(JSON.stringify({ error: '크레딧 부족.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI error: ${res.status}`);
    }

    const aiData = await res.json();
    const modelContent = aiData?.choices?.[0]?.message?.content || '{}';
    const dashboardData = parseJsonFromModel(modelContent);
    let mergedMotorSpecs = Array.isArray(dashboardData.motorSpecs) ? dashboardData.motorSpecs : [];

    if (mergedMotorSpecs.length < 40) {
      try {
        const supplementRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro',
            messages: [
              {
                role: 'system',
                content: `당신은 전기차 파워트레인 데이터 리서처입니다. 아래 JSON 형식으로만 응답하세요.\n{\n  "motorSpecs": [\n    {\n      "year": "출시연도",\n      "oem": "완성차 제조사",\n      "model": "차종명",\n      "segment": "세그먼트",\n      "priceUsd": "가격(USD 숫자)",\n      "motorSupplier": "모터 공급사",\n      "torqueNm": "토크(Nm 숫자)",\n      "powerKw": "출력(kW 숫자)",\n      "maxSpeedRpm": "최대속도(rpm 숫자)",\n      "notable": "주목 기술(차량 레벨이면 표기)"\n    }\n  ]\n}\n규칙: BEV/HEV/PHEV 글로벌 주요 모델을 120개 이상 작성, 공개 검증 불가 값은 '-'로 표기, '정보 없음' 금지, 중복 금지, 연도 내림차순.`
              },
              {
                role: 'user',
                content: 'Tesla, Hyundai, Kia, BMW, Mercedes-Benz, Audi, Porsche, VW, BYD, Toyota, Honda, Nissan, Ford, GM/Chevrolet, Rivian, Lucid, Volvo/Polestar, Stellantis, Renault 등 주요 OEM의 전동화 차종을 폭넓게 포함해서 motorSpecs를 생성해줘.'
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 12000,
          }),
        });

        if (supplementRes.ok) {
          const supplementData = await supplementRes.json();
          const supplementContent = supplementData?.choices?.[0]?.message?.content || '{}';
          const supplementJson = parseJsonFromModel(supplementContent);
          const supplementSpecs = Array.isArray(supplementJson.motorSpecs) ? supplementJson.motorSpecs : [];
          mergedMotorSpecs = [...mergedMotorSpecs, ...supplementSpecs];
        }
      } catch (supplementError) {
        console.error('Supplement motor specs generation failed:', supplementError);
      }
    }

    dashboardData.motorSpecs = dedupeAndSortMotorSpecs(mergedMotorSpecs);

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
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
