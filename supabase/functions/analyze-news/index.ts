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

    console.log('Starting news analysis...');

    // Fetch recent news (up to 300)
    const { data: newsData, error: newsError } = await supabase
      .from('news')
      .select('*')
      .order('date', { ascending: false })
      .limit(300);

    if (newsError) {
      console.error('Error fetching news:', newsError);
      throw newsError;
    }

    if (!newsData || newsData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No news articles found to analyze' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare news summary for AI analysis
    const newsSummary = newsData.map(article => 
      `[${article.category}] ${article.title_kr}\n${article.summary}\n출처: ${article.source} (${article.date})`
    ).join('\n\n');

    const systemPrompt = `당신은 전기차 모터 기술 R&D 전문가입니다. 뉴스 기사들을 분석하여 모터 기술 중심의 구조화된 인사이트를 JSON 형식으로 제공해주세요.

중요: 추상적이고 범위가 넓은 분석이 아닌, 모터 R&D 엔지니어에게 실질적으로 도움이 되는 기술 중심 분석을 제공하세요.

응답은 반드시 다음 JSON 구조를 따라야 합니다:
{
  "summary": "핵심 모터 기술 동향 요약 (2-3문장, 구체적 기술명 포함)",
  "keywords": ["키워드1", "키워드2", ...] (10-15개의 모터 기술 키워드),
  "sections": [
    {
      "title": "섹션 제목",
      "insights": ["인사이트1", "인사이트2", ...] (각 섹션당 3-5개)
    }
  ]
}

다음 관점에서 모터 기술 중심으로 분석해주세요:
1. 모터 설계 기술 동향 (Hairpin, Flat Wire, Axial Flux, IPMSM 고속화, 무자석모터 등)
2. 소재·부품 기술 (SiC, GaN, NdFeB 대체, Ferrite 모터, 냉각 기술 등)
3. 시스템 통합 기술 (e-Axle, 800V 아키텍처, 인버터 통합, P1~P4 구동 방식)
4. 제조·공정 기술 (권선 자동화, 적층 코어, 코팅 기술 등)
5. 경쟁사 모터 기술 벤치마킹 (Tesla, BYD, Hyundai 등의 최신 모터 스펙 및 기술 선택)

각 인사이트는 구체적인 기술명, 수치, 업체명을 포함하여 R&D 엔지니어가 바로 참고할 수 있도록 작성하세요.`;

    // Call Lovable AI for analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `다음은 최근 ${newsData.length}개의 전기차 모터 관련 뉴스입니다:\n\n${newsSummary}\n\n이 뉴스들을 종합적으로 분석하여 우리 회사(모터 제조사)가 나아가야 할 전략적 방향을 JSON 형식으로 제시해주세요. 반드시 유효한 JSON만 응답해야 합니다.` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let analysisContent = aiData.choices[0].message.content;
    
    // Remove markdown code blocks if present (```json ... ```) and normalize to pure JSON string
    analysisContent = analysisContent.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(analysisContent);
      analysisContent = JSON.stringify(parsed);
    } catch {
      const match = analysisContent.match(/{[\s\S]*}/);
      if (match) {
        try {
          analysisContent = JSON.stringify(JSON.parse(match[0]));
        } catch {}
      }
    }

    // Delete old insights (keep only the most recent)
    const { error: deleteError } = await supabase
      .from('insights')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Error deleting old insights:', deleteError);
    }

    // Save new insight
    const { data: insightData, error: insightError } = await supabase
      .from('insights')
      .insert([{
        content: analysisContent,
        news_analyzed_count: newsData.length
      }])
      .select()
      .single();

    if (insightError) {
      console.error('Error saving insight:', insightError);
      throw insightError;
    }

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        insight: insightData,
        message: 'News analysis completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-news function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
