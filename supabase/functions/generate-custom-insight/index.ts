import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { prompt } = await req.json();

    // Input validation
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0 || trimmedPrompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Prompt must be between 1 and 2000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = serviceKey;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch latest news articles
    const { data: news, error: newsError } = await supabase
      .from('news')
      .select('title, title_kr, summary, category, date, source')
      .order('date', { ascending: false })
      .limit(100);

    if (newsError) throw newsError;

    if (!news || news.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No news articles available for analysis' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format news for AI analysis
    const newsContext = news.map((article, idx) => 
      `[${idx + 1}] ${article.title_kr}\n` +
      `Categories: ${article.category.join(', ')}\n` +
      `Date: ${article.date}\n` +
      `Summary: ${article.summary}\n` +
      `Source: ${article.source}`
    ).join('\n\n');

    // Call Lovable AI
    const systemPrompt = `You are an expert analyst for an EV motor manufacturing company. 
Analyze the provided news articles and respond to the user's specific request.
Provide detailed, actionable insights in Korean that are relevant to the company's strategy and operations.`;

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
          { 
            role: 'user', 
            content: `다음은 최근 수집된 전기차 모터 산업 관련 뉴스 기사들입니다:\n\n${newsContext}\n\n사용자 요청: ${trimmedPrompt}\n\n위 뉴스 기사들을 바탕으로 사용자의 요청에 답변해주세요.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate insight');
    }

    const aiData = await aiResponse.json();
    const insight = aiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        insight,
        articlesAnalyzed: news.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-custom-insight:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
