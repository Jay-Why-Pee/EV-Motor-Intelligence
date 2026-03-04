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

  // Auth check
  const authHeader = req.headers.get('Authorization');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader?.replace('Bearer ', '') || '';
  if (!authHeader || (token !== anonKey && token !== serviceKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 1 || prompt.trim().length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid prompt (1-500 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    // Fetch all news
    const { data: newsData, error: newsError } = await supabase
      .from('news')
      .select('*')
      .order('date', { ascending: false })
      .limit(200);

    if (newsError) throw newsError;
    if (!newsData || newsData.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build news list for AI
    const newsList = newsData.map((n, i) =>
      `[${i}] ${n.title_kr} | ${n.category?.join(', ')} | ${n.source} | ${n.date}`
    ).join('\n');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `당신은 뉴스 검색 도우미입니다. 사용자의 검색어와 관련된 뉴스 기사의 인덱스 번호를 JSON 배열로 반환하세요.
관련성이 높은 순서대로 최대 20개까지 선택하세요.
응답 형식: {"indices": [0, 5, 12, ...]}`
          },
          {
            role: 'user',
            content: `검색어: "${prompt.trim()}"\n\n뉴스 목록:\n${newsList}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;
    content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(content);
    const indices: number[] = (parsed.indices || []).filter(
      (i: number) => typeof i === 'number' && i >= 0 && i < newsData.length
    );

    const results = indices.map(i => newsData[i]);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-news:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
