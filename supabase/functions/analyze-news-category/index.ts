import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { category } = await req.json();
    if (!category || category === "all") {
      return new Response(JSON.stringify({ insights: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const { data: news, error } = await supabase
      .from("news")
      .select("*")
      .contains("category", [category])
      .order("date", { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!news || news.length === 0) {
      return new Response(JSON.stringify({ insights: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newsText = news.map((a: any, i: number) => `[${i}] [${a.date}] ${a.title_kr}\n${a.summary}`).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `당신은 EV 모터 시장 분석 전문가입니다. 주어진 뉴스들을 종합 분석하여 핵심 인사이트를 도출하세요.
반드시 아래 JSON 형식으로만 응답:
{
  "insights": [
    {
      "title": "인사이트 제목 (한국어)",
      "content": "상세 분석 (한국어, 3-5문장)",
      "sourceIndices": [0, 1, 3]
    }
  ]
}
- insights는 1~5개
- sourceIndices는 참고한 뉴스의 인덱스 번호 (0부터)
- 핵심적이고 실용적인 인사이트만 포함`
          },
          { role: "user", content: `"${category}" 카테고리의 최근 뉴스 ${news.length}건을 분석하세요:\n\n${newsText}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);
    const insights = (parsed.insights || []).map((ins: any) => ({
      title: ins.title,
      content: ins.content,
      sources: (ins.sourceIndices || [])
        .filter((i: number) => i < news.length)
        .map((i: number) => ({
          title_kr: news[i].title_kr,
          source: news[i].source,
          date: news[i].date,
          url: news[i].url,
        })),
    }));

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
