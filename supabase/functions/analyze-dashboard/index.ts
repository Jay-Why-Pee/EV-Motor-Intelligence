import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      "weightKg": "모터 중량(kg, 숫자만)",
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

2. motorSpecs: 글로벌 주요 완성차 OEM들의 확인 가능한 모든 BEV/PHEV 차종 정보를 최대한 많이 수집 (40~80개 목표).
   - 출시연도(year) 내림차순 정렬.
   - 반드시 실제로 공개된/검증된 스펙만 입력. 확인 불가 시 "-"로 표기 (절대 추측하지 말 것).
   - 단위: 가격은 USD 숫자만(예: 42990), 토크는 Nm, 출력은 kW, 회전수는 rpm, 중량은 kg.
   - 포함 OEM: Tesla, Hyundai, Kia, BMW, Mercedes-Benz, Audi, Porsche, VW, BYD, NIO, Xpeng, Li Auto, Geely/Zeekr, Toyota, Honda, Nissan, Ford, GM/Chevrolet, Rivian, Lucid, Volvo/Polestar, Stellantis, Renault 등.
   - 차량의 공식 스펙시트에서 motor max torque(Nm), motor max power(kW), motor max speed(rpm) 정보를 찾아 입력. 차량 레벨 토크/출력이 아닌 모터 단품 스펙 우선. 모터 단품 스펙을 모르면 차량 레벨 값 입력 후 notable에 "(차량 레벨)" 표기.

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
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `=== 최근 뉴스 (${newsData.length}건) ===\n${newsSummary}\n\n위 데이터를 분석하여 대시보드 데이터를 JSON으로 생성해주세요.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 10000,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: '요청 한도 초과. 잠시 후 다시 시도해주세요.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (res.status === 402) return new Response(JSON.stringify({ error: '크레딧 부족.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI error: ${res.status}`);
    }

    const aiData = await res.json();
    let content = aiData.choices[0].message.content;
    content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const dashboardData = JSON.parse(content);

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
