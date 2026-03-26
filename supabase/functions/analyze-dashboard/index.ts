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

  return [...map.values()].sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0)).slice(0, 300);
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
      "powertrain": "BEV|PHEV|MHEV|HEV",
      "motorPosition": "P1|P2|P3|P4|P1+P3|P2+P4|기타 조합",
      "segment": "세그먼트(B-SUV, D-Sedan 등)",
      "priceUsd": "가격(USD, 숫자만. 예: 42990)",
      "motorSupplier": "모터 공급업체",
      "torqueNm": "모터 최대 토크(Nm, 숫자만)",
      "powerKw": "모터 최대 출력(kW, 숫자만)",
      "maxSpeedRpm": "모터 최대 회전수(rpm, 숫자만)",
      "rangeKm": "공식 주행가능거리(km, 숫자만. 예: 510)",
      "notable": "주목할 기술 특징"
    }
  ],
  "roadmap": {
    "prm": [
      { "year": "2024", "category": "카테고리", "title": "제목", "description": "설명", "status": "past|current|future" }
    ],
    "trm": [
      { "year": "2024", "category": "카테고리", "title": "제목", "description": "설명", "status": "past|current|future" }
    ]
  }
}

규칙:
1. wordCloud: 20~30개의 EV 모터 전문 기술 키워드만 포함.
   - 반드시 제외할 단어: EV, 전기차, 배터리, 모터, 소프트웨어, 인버터, 자동차, 하이브리드, 전동화, Electric Vehicle, Battery, Motor, Software, Inverter 등 비기술적 통칭/일반 개념어.
   - 포함할 단어 예시: Hairpin Winding, SiC MOSFET, 800V Architecture, e-Axle, IPMSM, Flat Wire, NdFeB, Ferrite Magnet, Axial Flux, Distributed Winding, Concentrated Winding, Oil Cooling, Water Jacket, Bar Winding, I-pin, Segment Conductor, Dual Rotor, Halbach Array, Reluctance Torque, Back-EMF, GaN, Continuous Casting, Die-cast Copper Rotor 등 구체적 기술 용어만.

2. motorSpecs: 글로벌 주요 완성차 OEM들의 확인 가능한 모든 BEV/HEV/PHEV/MHEV 차종 정보를 최대한 많이 수집 (최소 150개, 목표 300개).
   - 출시연도(year) 내림차순 정렬.

   ★★★ 가장 중요한 규칙 — powertrain, motorPosition, rangeKm 필드 ★★★
   - powertrain: 반드시 BEV, PHEV, MHEV, HEV 중 하나를 기재. 모든 차종에 100% 필수.
     * 순수 전기차 → BEV
     * 플러그인 하이브리드 → PHEV
     * 마일드 하이브리드(48V 등) → MHEV
     * 풀 하이브리드(비플러그인) → HEV
     * 이 4개 외의 값이나 "-"는 절대 불가. 반드시 4개 중 하나를 선택하라.
   - motorPosition: 모터가 장착된 위치. 반드시 아래 규칙을 따를 것:
     * BEV 싱글모터(후륜) → P3
     * BEV 싱글모터(전륜) → P3
     * BEV 듀얼모터(전후) → P3+P4
     * BEV 트리모터 → P3+P4+P4
     * PHEV(엔진-변속기 사이 모터) → P2
     * PHEV(듀얼) → P2+P4
     * HEV(ISG 타입) → P0 또는 P1
     * HEV(변속기 내장) → P2
     * MHEV(48V BSG) → P0
     * 확인 불가 시에만 "-" 허용. 하지만 위 일반 규칙으로 대부분 추론 가능하므로 최대한 기재할 것.
   - rangeKm: 공식 발표 주행가능거리(WLTP 또는 EPA 기준, km 숫자만).
     * BEV는 반드시 주행거리가 있음. 300~700km 범위가 일반적. 반드시 기재.
     * PHEV는 EV 모드 주행거리(20~100km 범위). 가능하면 기재.
     * HEV/MHEV는 "-" 가능.

   - 단위: 가격은 USD 숫자만, 토크는 Nm 숫자만, 출력은 kW 숫자만, 회전수는 rpm 숫자만, 주행거리는 km 숫자만. 단위 문자열은 절대 포함하지 말 것.
   - 듀얼 모터 차량의 경우: 토크/출력을 슬래시로 구분 표기 (예: "300/200", "150/200"). 단일 모터는 숫자만.
   - 확인 불가 값만 "-"로 표기 (절대 추측하지 말 것, "정보 없음" 문자열 금지).
   - 포함 OEM: Tesla, Hyundai, Kia, BMW, Mercedes-Benz, Audi, Porsche, VW, BYD, NIO, Xpeng, Li Auto, Geely/Zeekr, Toyota, Honda, Nissan, Ford, GM/Chevrolet, Rivian, Lucid, Volvo/Polestar, Stellantis, Renault, SAIC, Changan, GAC Aion, Xiaomi, Chery, Great Wall/ORA, MG/SAIC, Vinfast, Tata, Mahindra, Lotus, Mazda, Subaru, Mitsubishi, Lexus, Genesis, Smart, Mini, Cupra, Skoda 등.
   - 중복 차종은 제거하고 차종명+트림은 명확히 구분.

3. roadmap:
   - PRM(Product Roadmap): EV 모터 제품 기술 발전 로드맵. 2020~2030 범위. 12~20개 항목.
     * category: "PMSM", "EESM", "SRM", "Axial Flux", "Wound Rotor", "e-Axle", "Multi-speed", "In-Wheel", "P0/P1 BSG", "P2 Hybrid", "P3 Drive", "P4 AWD", "Dual Motor", "Tri Motor" 등 EV 모터 제품 카테고리.
     * 구체적인 모터 아키텍처 변화, 구동계 토폴로지 진화, 통합형 e-Axle 트렌드, 멀티모터 구성 등 제품 수준의 기술 흐름.
     * 예시:
       - 2020 past: "IPMSM 주류 채택 - V-shape IPM 로터, 분포권 고정자 기반 BEV 주력 모터 표준화"
       - 2022 past: "Flat Wire(Hairpin) 양산 확대 - 슬롯 충전율 70%+ 달성, 효율 3~5% 향상"
       - 2024 current: "800V 시스템 표준화 - SiC 인버터 연계, 고속충전 대응 모터 절연 설계"
       - 2026 future: "Axial Flux 모터 양산 진입 - 고출력밀도 P4/In-wheel 적용 시작"
       - 2028 future: "EESM(외부 여자 동기모터) 확산 - 희토류 프리 모터, 광범위 효율맵"

   - TRM(Technical Roadmap): EV 모터 핵심 부품별 기술 발전 로드맵. 2020~2030 범위. 20~30개 항목.
     * category: "Stator Core", "Stator Winding", "Rotor Core", "Rotor Magnet", "Shaft", "Bearing", "Housing", "Cooling System", "Resolver/Sensor", "Busbar", "Terminal", "Insulation", "Lamination", "Inverter/Power Module", "Connector", "Sealing/Gasket", "Balancing" 등 모터를 구성하는 모든 부품 카테고리.
     * 각 부품별 소재, 공법, 설계 변화를 구체적으로 기술:
       - Stator Core: 전기강판 두께(0.35→0.25→0.2mm), 자속밀도, 철손 저감, 분할 코어
       - Stator Winding: 원형→Hairpin→Continuous Hairpin→I-pin, 슬롯 충전율 변화
       - Rotor Core: IPM V-shape→Delta→Spoke, 브릿지 최적화, 경량화
       - Rotor Magnet: NdFeB→저Dy NdFeB→Ferrite→희토류프리, Halbach 배열
       - Cooling: Water Jacket→Direct Oil Cooling→Stator Slot Oil Spray→Hollow Shaft Oil
       - Insulation: Class H→Class R, 800V 부분방전 대응, Polyimide/Enamel 변화
       - Bearing: Ball→Ceramic Ball→Magnetic Bearing, 고속 대응
       - Inverter: Si IGBT→SiC MOSFET→GaN, 모듈 통합, 전력밀도
       - Resolver: Resolver→TMR→Inductive encoder, 정밀도/비용 트레이드오프
       - Lamination: 0.35mm NO→0.25mm→0.2mm, 6.5% Si강, Amorphous
       - Busbar: 구리→알루미늄, 적층 부스바, EMC 최적화
       - Housing: 주철→알루미늄 다이캐스트→통합형 e-Axle 하우징
     * 예시 항목:
       - 2020 past Stator Winding: "Round Wire 분포권 - 슬롯 충전율 45%, 자동화 권선기 기반"
       - 2022 past Stator Winding: "Hairpin(Flat Wire) 양산 - 슬롯 충전율 65%, 용접 공정 도입"
       - 2024 current Stator Winding: "Continuous Hairpin - 용접점 50% 감소, I-pin 공법 검증 중"
       - 2026 future Stator Winding: "I-pin/Segment Conductor - 슬롯 충전율 75%+, 다층 적층"
       - 2020 past Rotor Magnet: "고Dy NdFeB - 내열성 확보, 희토류 의존도 높음"
       - 2024 current Rotor Magnet: "저Dy/Dy-free NdFeB - Grain Boundary Diffusion 공법"
       - 2028 future Rotor Magnet: "Ferrite/희토류프리 - EESM 확산, 원가 30%+ 절감"

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
          { role: 'user', content: `=== 최근 뉴스 (${newsData.length}건) ===\n${newsSummary}\n\n위 데이터를 분석하여 대시보드 데이터를 JSON으로 생성해주세요. motorSpecs는 뉴스에 언급된 차종뿐 아니라 글로벌 모든 완성차의 BEV/HEV/PHEV/MHEV 전체 라인업을 포함해주세요. 최소 150개 이상 차종을 목표로 하세요. 각 차종에 powertrain(BEV/PHEV/MHEV/HEV), motorPosition(P1~P4 조합), rangeKm(주행가능거리) 정보를 반드시 포함하세요.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 30000,
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

    if (mergedMotorSpecs.length < 150) {
      try {
        const existingModels = mergedMotorSpecs.map((s: any) => `${s.oem}::${s.model}`).join(', ');
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
                content: `당신은 전기차 파워트레인 데이터 리서처입니다. 아래 JSON 형식으로만 응답하세요.\n{\n  "motorSpecs": [\n    {\n      "year": "출시연도",\n      "oem": "완성차 제조사",\n      "model": "차종명",\n      "powertrain": "BEV|PHEV|MHEV|HEV",\n      "motorPosition": "P0|P1|P2|P3|P4|P2+P4|P3+P4 등",\n      "segment": "세그먼트",\n      "priceUsd": "가격(USD 숫자)",\n      "motorSupplier": "모터 공급사",\n      "torqueNm": "토크(Nm 숫자)",\n      "powerKw": "출력(kW 숫자)",\n      "maxSpeedRpm": "최대속도(rpm 숫자)",\n      "rangeKm": "주행가능거리(km 숫자)",\n      "notable": "주목 기술"\n    }\n  ]\n}\n★★★ 필수 규칙 ★★★\n- powertrain: 반드시 BEV/PHEV/MHEV/HEV 중 하나. "-" 절대 금지.\n- motorPosition: BEV 싱글→P3, BEV 듀얼→P3+P4, PHEV→P2, MHEV→P0. "-" 최소화.\n- rangeKm: BEV는 반드시 주행거리 기재(300~700km). PHEV는 EV모드 거리. HEV/MHEV만 "-" 허용.\n- 200개 이상 작성, 공개 검증 불가 값만 '-', '정보 없음' 금지, 중복 금지, 연도 내림차순. 듀얼 모터 토크/출력은 슬래시 구분(예: 300/200).`
              },
              {
                role: 'user',
                content: `이미 포함된 차종: ${existingModels}\n\n위 차종을 제외하고 누락된 글로벌 BEV/PHEV/MHEV/HEV 차종을 200개 이상 추가로 생성해줘. Tesla, Hyundai, Kia, BMW, Mercedes-Benz, Audi, Porsche, VW, BYD, NIO, Xpeng, Li Auto, Geely/Zeekr, Toyota, Honda, Nissan, Ford, GM, Rivian, Lucid, Volvo/Polestar, Stellantis, Renault, Chery, Great Wall, MG, Vinfast, Tata, Lotus, Lexus, Genesis, Mini, Cupra, Mazda, Subaru 등 모든 OEM 포함.`
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            max_tokens: 30000,
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
