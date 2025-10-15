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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting news analysis...');

    // Fetch all recent news
    const { data: newsData, error: newsError } = await supabase
      .from('news')
      .select('*')
      .order('date', { ascending: false })
      .limit(50);

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

    const systemPrompt = `당신은 전기차 모터 산업 전문가입니다. 뉴스 기사들을 분석하여 모터 제조 회사가 나아가야 할 방향에 대한 전략적 인사이트를 제공해주세요.

다음 관점에서 분석해주세요:
1. 시장 트렌드 및 경쟁 환경
2. 핵심 기술 동향 (SiC, 800V 시스템, 효율성 개선 등)
3. 지역별 시장 기회
4. 공급망 및 제조 전략
5. 향후 6-12개월 내 집중해야 할 핵심 영역

분석은 한국어로 작성하되, 구체적이고 실행 가능한 인사이트를 제공해주세요.`;

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
          { role: 'user', content: `다음은 최근 ${newsData.length}개의 전기차 모터 관련 뉴스입니다:\n\n${newsSummary}\n\n이 뉴스들을 종합적으로 분석하여 우리 회사(모터 제조사)가 나아가야 할 전략적 방향을 제시해주세요.` }
        ],
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
    const analysisContent = aiData.choices[0].message.content;

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
