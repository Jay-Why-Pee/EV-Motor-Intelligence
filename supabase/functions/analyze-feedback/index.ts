import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: feedbacks, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    if (!feedbacks || feedbacks.length === 0) {
      return new Response(JSON.stringify({ summary: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const feedbackText = feedbacks.map((f: any) =>
      `[${f.category}] (만족도:${f.mood}/5) ${f.message}`
    ).join("\n");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const response = await fetch("https://api.lovable.dev/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `당신은 사용자 피드백 분석 전문가입니다. 주어진 피드백들을 종합 분석하여 핵심 수요와 개선 요청을 요약해주세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "overallMood": "전체 만족도 요약 (한 줄)",
  "topDemands": [
    { "title": "수요 제목", "description": "설명", "count": 관련 피드백 수 },
    ...
  ],
  "improvements": [
    { "title": "개선 제목", "description": "설명", "count": 관련 피드백 수 },
    ...
  ],
  "summary": "전체 피드백 종합 요약 (2-3문장)"
}`
          },
          {
            role: "user",
            content: `다음 ${feedbacks.length}개의 피드백을 분석해주세요:\n\n${feedbackText}`
          }
        ]
      }),
    });

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let parsed = null;
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = { summary: content, topDemands: [], improvements: [], overallMood: "" };
      }
    }

    return new Response(JSON.stringify({ summary: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
