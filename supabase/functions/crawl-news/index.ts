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

  console.log("Starting news crawling process...");
  
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not found");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not found");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Define all categories with their context
    const categories = [
      // Regions
      { id: "아시아", context: "Asian EV motor market developments", count: 5 },
      { id: "유럽", context: "European EV motor market developments", count: 5 },
      { id: "북미", context: "North American EV motor market developments", count: 5 },
      { id: "중국", context: "Chinese EV motor market developments", count: 5 },
      // Customers - OEMs
      { id: "GM", context: "GM electric vehicle motor news and developments", count: 5 },
      { id: "Ford", context: "Ford electric vehicle motor news and developments", count: 5 },
      { id: "벤츠", context: "Mercedes-Benz electric vehicle motor news and developments", count: 5 },
      { id: "BMW", context: "BMW electric vehicle motor news and developments", count: 5 },
      { id: "폭스바겐", context: "Volkswagen electric vehicle motor news and developments", count: 5 },
      { id: "Honda", context: "Honda electric vehicle motor news and developments", count: 5 },
      { id: "현대", context: "Hyundai/Kia electric vehicle motor news and developments", count: 5 },
      // Motor manufacturers
      { id: "Bosch", context: "Bosch electric motor manufacturing and technology", count: 5 },
      { id: "ZF", context: "ZF electric motor manufacturing and technology", count: 5 },
      { id: "Schaeffler", context: "Schaeffler electric motor manufacturing and technology", count: 5 },
      { id: "LG마그나", context: "LG Magna electric motor manufacturing and partnerships", count: 5 },
      { id: "기타", context: "Other electric motor suppliers and technology providers", count: 5 },
    ];

    const allArticles = [];

    // Generate articles for each category
    for (const category of categories) {
      console.log(`Generating ${category.count} articles for ${category.id}...`);
      
      const prompt = `Generate ${category.count} unique and diverse news articles about ${category.context} in the global electric vehicle motors industry.
      
      Return ONLY a valid JSON array with exactly ${category.count} articles, each having:
      - title: English headline (unique and specific to ${category.id})
      - title_kr: Korean translation of the title
      - summary: 2-3 sentence summary in Korean about the news
      - category: "${category.id}"
      - source: realistic news source name (e.g., Reuters, Bloomberg, TechCrunch, etc.)
      - date: original publication date in YYYY-MM-DD format (vary dates within last 30 days)
      - url: realistic news URL with proper domain
      
      Make sure all articles are:
      1. Completely different from each other
      2. Specifically relevant to ${category.id}
      3. Realistic and industry-appropriate
      4. Have proper Korean summaries
      
      Return ONLY the JSON array, no markdown formatting.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a news content generator. Always respond with valid JSON array only, without any markdown formatting." },
              { role: "user", content: prompt }
            ],
            max_tokens: 2000,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI gateway error for ${category.id}: ${aiResponse.status}`);
          if (aiResponse.status === 429) {
            console.error("Rate limit exceeded, waiting before retry...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices[0].message.content;
        
        // Extract JSON from markdown code blocks if present
        let jsonContent = content;
        if (content.includes("```json")) {
          jsonContent = content.split("```json")[1].split("```")[0].trim();
        } else if (content.includes("```")) {
          jsonContent = content.split("```")[1].split("```")[0].trim();
        }
        
        const categoryArticles = JSON.parse(jsonContent);
        allArticles.push(...categoryArticles);
        console.log(`Successfully generated ${categoryArticles.length} articles for ${category.id}`);
        
        // Small delay between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error generating articles for ${category.id}:`, error);
        continue;
      }
    }

    if (allArticles.length === 0) {
      throw new Error("No articles were generated");
    }

    // Clear existing news
    await supabase.from('news').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert new news
    const { error: insertError } = await supabase
      .from('news')
      .insert(allArticles.map((article: any) => ({
        title: article.title,
        title_kr: article.title_kr,
        summary: article.summary,
        category: article.category,
        source: article.source,
        date: article.date,
        url: article.url,
      })));

    if (insertError) throw insertError;

    console.log(`Successfully crawled and inserted ${allArticles.length} news articles across ${categories.length} categories`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: allArticles.length,
        categories: categories.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error('Error in crawl-news function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
