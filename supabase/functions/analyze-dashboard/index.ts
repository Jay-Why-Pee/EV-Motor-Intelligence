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

    // Fetch news
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

    // Fetch existing research/patent analysis for context
    const { data: researchData } = await supabase.from('market_analysis').select('content').eq('type', 'research').maybeSingle();
    const { data: patentData } = await supabase.from('market_analysis').select('content').eq('type', 'patents').maybeSingle();

    const newsSummary = newsData.map(a =>
      `[${a.category?.join(', ')}] ${a.title_kr}\n${a.summary}\n출처: ${a.source} (${a.date})`
    ).join('\n\n');

    const researchContext = researchData?.content ? JSON.stringify(researchData.content).slice(0, 3000) : '없음';
    const patentContext = patentData?.content ? JSON.stringify(patentData.content).slice(0, 3000) : '없음';

    const systemPrompt = `당신은 전기차 모터 산업 데이터 분석 전문가입니다. 제공된 뉴스, 논문, 특허 데이터를 기반으로 대시보드용 구조화된 차트 데이터를 생성하세요.

반드시 아래 JSON 구조로 응답하세요:
{
  "kpis": [
    { "title": "string", "value": "string", "change": "string", "trend": "up|down", "iconType": "trend|paper|patent|risk|company" }
  ],
  "news": {
    "keywordTrend": [
      { "month": "YYYY-MM", "Hairpin": 0, "SiC": 0, "800V": 0, "e-Axle": 0, "무자석모터": 0 }
    ],
    "oemHeatmap": [
      { "company": "Tesla", "모터효율": 0, "희토류": 0, "e-Axle": 0, "SiC": 0, "냉각": 0 }
    ],
    "policyTrend": [
      { "policy": "IRA", "mentions": 0, "change": "+0%", "impact": 0 }
    ]
  },
  "research": {
    "topicTrend": [
      { "period": "2024 Q1", "IPMSM고속설계": 0, "SRM": 0, "무자석모터": 0, "800V열관리": 0, "권선기술": 0 }
    ],
    "countryResearch": [
      { "country": "중국", "papers": 0, "ratio": 0 }
    ]
  },
  "patents": {
    "companyTrend": [
      { "year": "2022", "BYD": 0, "Tesla": 0, "Toyota": 0, "Hyundai": 0, "Bosch": 0, "LG": 0 }
    ],
    "risingTech": [
      { "tech": "기술명", "growth": 0, "count": 0 }
    ],
    "influenceTop": [
      { "rank": 1, "title": "특허명", "company": "기업명", "citations": 0, "tech": "기술분야" }
    ]
  }
}

규칙:
1. KPI 5개: (1)뉴스 기반 기술 상승률 1위 키워드+변화율 (2)최근 EV모터 논문 동향 수치 (3)특허 출원 증가율 (4)희토류/공급망 리스크 언급 수 (5)OEM 뉴스 증가 TOP 기업
2. keywordTrend: 최근 6개월, 5~7개 EV모터 기술 키워드(Hairpin,SiC,800V,e-Axle,무자석모터,GaN 등)의 월별 뉴스 언급량
3. oemHeatmap: 6~8개 주요기업(Tesla,Hyundai,BYD,Toyota,Bosch,Continental,LG,Nidec)의 5~6개 기술키워드 언급빈도(0~10)
4. policyTrend: 4~6개 정책(IRA,EU규제,중국NEV,RAW,일본보조금 등)의 언급량+모터기술 영향도(1~10)
5. topicTrend: 최근 4분기, 5개 연구주제의 논문 수 추정
6. countryResearch: 5개국 연구비중
7. companyTrend: 3년간 6개기업 특허출원 추정
8. risingTech: 특허 증가율 TOP 10
9. influenceTop: 영향력 특허 TOP 10

뉴스에서 직접 확인되는 수치는 그대로, 나머지는 업계 트렌드 기반 합리적 추정.`;

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
          { role: 'user', content: `=== 최근 뉴스 (${newsData.length}건) ===\n${newsSummary}\n\n=== 논문 분석 ===\n${researchContext}\n\n=== 특허 분석 ===\n${patentContext}\n\n위 데이터를 분석하여 대시보드 차트 데이터를 JSON으로 생성해주세요.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: '요청 한도 초과. 잠시 후 다시 시도해주세요.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (res.status === 402) return new Response(JSON.stringify({ error: '크레딧 부족. 워크스페이스 설정에서 크레딧을 충전해주세요.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI error: ${res.status}`);
    }

    const aiData = await res.json();
    let content = aiData.choices[0].message.content;
    content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const dashboardData = JSON.parse(content);

    // Store in market_analysis
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
