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
      "oem": "완성차 제조사",
      "model": "차종명",
      "segment": "세그먼트(B-SUV, D-Sedan 등)",
      "priceUsd": "가격(USD)",
      "motorSupplier": "모터 공급업체",
      "motorName": "모터 이름/모델명",
      "torqueVehicle": "차량 토크(Nm)",
      "torqueMotor": "모터 토크(Nm)",
      "powerVehicle": "차량 출력(kW or HP)",
      "powerMotor": "모터 출력(kW)",
      "maxSpeedVehicle": "차량 최대속도(km/h)",
      "maxSpeedMotor": "모터 최대 RPM",
      "weightMotor": "모터 중량(kg)",
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
1. wordCloud: 20~30개의 EV 모터 기술 키워드. 뉴스에서 자주 언급되는 기술(Hairpin, SiC, 800V, e-Axle, IPMSM, Flat Wire, NdFeB, Ferrite, Axial Flux 등)의 상대적 빈도를 value로 표현.

2. motorSpecs: 실제 출시된 EV/HEV 차량에 장착된 모터 정보 15~25개. 최신 차종 우선 정렬.
   - 반드시 실제로 존재하는 정보만 입력. 없는 정보는 "정보 없음"으로 표기.
   - Tesla Model 3/Y/S/X, Hyundai Ioniq 5/6, Kia EV6/EV9, BMW iX/i4, Mercedes EQS/EQE, BYD Seal/Han, VW ID.4, Porsche Taycan, Lucid Air, Rivian R1T 등 실제 차종.

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
