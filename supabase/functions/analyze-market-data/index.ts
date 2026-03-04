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

  // Auth check: only allow requests with valid project keys
  const authHeader = req.headers.get('Authorization');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader?.replace('Bearer ', '') || '';
  if (!authHeader || (token !== anonKey && token !== serviceKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = serviceKey;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting market data analysis from news...');

    // Fetch recent news
    const { data: newsData, error: newsError } = await supabase
      .from('news')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    if (newsError) throw newsError;
    if (!newsData || newsData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No news to analyze' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newsSummary = newsData.map(a =>
      `[${a.category?.join(', ')}] ${a.title_kr}\n${a.summary}\n출처: ${a.source} (${a.date})`
    ).join('\n\n');

    const callAI = async (systemPrompt: string, userPrompt: string) => {
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
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 6000,
        }),
      });
      if (!res.ok) throw new Error(`AI error: ${res.status}`);
      const data = await res.json();
      let content = data.choices[0].message.content;
      content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      return JSON.parse(content);
    };

    // 1. Generate Charts/KPI data
    console.log('Generating charts data...');
    const chartsData = await callAI(
      `당신은 전기차 모터 시장 데이터 분석 전문가입니다. 뉴스 기사들을 기반으로 시장 데이터를 추출/추정하여 JSON으로 제공하세요.
반드시 다음 JSON 구조로 응답:
{
  "kpis": [
    { "title": "KPI명", "value": "값", "change": "변화율", "trend": "up|down", "source": "출처", "sourceUrl": "URL" }
  ],
  "marketSize": [
    { "year": "2020", "market": 28.5, "forecast": 28.5 }
  ],
  "regionalShare": [
    { "name": "지역명", "value": 38.5 }
  ],
  "technologyTrend": [
    { "tech": "기술명", "adoption": 62, "growth": 8.5 }
  ],
  "lastUpdated": "YYYY-MM-DD"
}
뉴스에서 언급된 실제 수치와 트렌드를 반영하고, 언급되지 않은 부분은 최신 시장 보고서 기반으로 합리적으로 추정하세요.
KPI는 정확히 4개: 글로벌 시장 규모, 연간 성장률, 주요 제조사 수, 기술 혁신 지수.
marketSize는 2020~2028년 데이터 (2024년 이후는 forecast만).
regionalShare는 중국, 유럽, 북미, 일본, 기타 5개 지역.
technologyTrend는 주요 모터 기술 4~5개.`,
      `다음은 최근 수집된 ${newsData.length}개의 전기차 모터 관련 뉴스입니다:\n\n${newsSummary}\n\n이 뉴스들의 내용을 분석하여 최신 시장 데이터를 JSON으로 제공해주세요.`
    );

    // 2. Generate Research Papers data
    console.log('Generating research data...');
    const researchData = await callAI(
      `당신은 전기차 모터 기술 연구 전문가입니다. 뉴스 기사들에서 언급된 기술, 연구 동향, 학술적 발견을 기반으로 관련 연구 논문 정보를 추출/생성하세요.
반드시 다음 JSON 구조로 응답:
{
  "papers": [
    {
      "title": "논문 제목 (영문)",
      "authors": "저자1, 저자2",
      "journal": "학술지명",
      "year": "2024",
      "summary": "논문 요약 (한국어, 2-3문장)",
      "keywords": ["키워드1", "키워드2"],
      "link": "https://실제접근가능한URL"
    }
  ],
  "lastUpdated": "YYYY-MM-DD"
}
- 뉴스에서 언급된 기술 트렌드(SiC, 800V, 헤어핀 권선, 영구자석 등)와 직접 관련된 논문 5~8개
- link는 반드시 IEEE(ieeexplore.ieee.org), ScienceDirect, MDPI 등 실제 존재하는 학술DB의 검색 URL로 제공
- 예: "https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=키워드" 형태
- 절대 존재하지 않는 DOI나 article ID를 만들어내지 마세요`,
      `다음은 최근 ${newsData.length}개의 전기차 모터 관련 뉴스입니다:\n\n${newsSummary}\n\n뉴스에서 다루는 핵심 기술과 관련된 최신 연구 논문 정보를 JSON으로 제공해주세요.`
    );

    // 3. Generate Patents data
    console.log('Generating patents data...');
    const patentsData = await callAI(
      `당신은 전기차 모터 특허 분석 전문가입니다. 뉴스 기사들에서 언급된 기업과 기술을 기반으로 관련 특허 정보를 추출/생성하세요.
반드시 다음 JSON 구조로 응답:
{
  "patents": [
    {
      "title": "특허 제목",
      "patentNumber": "특허 번호",
      "applicant": "출원인/회사명",
      "filingDate": "YYYY-MM-DD",
      "country": "국가",
      "summary": "특허 요약 (한국어, 2-3문장)",
      "technicalField": ["기술분야1", "기술분야2"],
      "link": "https://patents.google.com/검색URL"
    }
  ],
  "lastUpdated": "YYYY-MM-DD"
}
- 뉴스에 언급된 기업(Tesla, Hyundai, Bosch, BYD 등)의 EV 모터 관련 특허 5~8개
- link는 Google Patents 검색 URL 사용: "https://patents.google.com/?q=키워드&assignee=회사명" 형태
- 절대 존재하지 않는 특허 번호를 만들어내지 마세요. 검색 URL을 사용하세요.`,
      `다음은 최근 ${newsData.length}개의 전기차 모터 관련 뉴스입니다:\n\n${newsSummary}\n\n뉴스에서 언급된 기업과 기술 관련 특허 정보를 JSON으로 제공해주세요.`
    );

    // Upsert all data
    const upsertData = [
      { type: 'charts', content: chartsData, news_analyzed_count: newsData.length },
      { type: 'research', content: researchData, news_analyzed_count: newsData.length },
      { type: 'patents', content: patentsData, news_analyzed_count: newsData.length },
    ];

    for (const item of upsertData) {
      const { error } = await supabase
        .from('market_analysis')
        .upsert({
          type: item.type,
          content: item.content,
          news_analyzed_count: item.news_analyzed_count,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'type' });
      if (error) console.error(`Error upserting ${item.type}:`, error);
    }

    console.log('Market data analysis completed');

    return new Response(
      JSON.stringify({ success: true, newsAnalyzed: newsData.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
