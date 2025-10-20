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

    // Helper utilities for URL validation and normalization
    const DEFAULT_UA = 'Mozilla/5.0 (compatible; LovableNewsBot/1.0; +https://lovable.dev)';

    const normalizeUrl = (raw: string): string => {
      try {
        let u = (raw || '').trim();
        if (!u) return '';
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        const url = new URL(u);
        url.hash = '';
        return url.toString();
      } catch {
        return '';
      }
    };

    const fetchWithTimeout = async (input: string, init: RequestInit = {}, timeoutMs = 8000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(input, {
          ...init,
          redirect: 'follow',
          headers: {
            'User-Agent': DEFAULT_UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,ko-KR,ko;q=0.8',
            ...(init.headers || {}),
          },
          signal: controller.signal,
        });
        return res;
      } finally {
        clearTimeout(id);
      }
    };

    const extractTitle = (html: string): string => {
      const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      return m ? m[1].replace(/\s+/g, ' ').trim() : '';
    };

    const extractCanonical = (html: string): string | null => {
      const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+>/i);
      if (!m) return null;
      const href = m[0].match(/href=["']([^"']+)["']/i);
      return href ? href[1] : null;
    };

    const isTitleMatch = (pageTitle: string, articleTitle: string): boolean => {
      if (!pageTitle || !articleTitle) return false;
      const a = pageTitle.toLowerCase();
      const b = articleTitle.toLowerCase();
      const tokens = b.split(/[^a-z0-9]+/i).filter(t => t.length >= 5);
      const hits = tokens.filter(t => a.includes(t));
      return hits.length >= Math.max(1, Math.ceil(tokens.length * 0.2));
    };

    const validateAndFixUrl = async (article: any) => {
      const original = normalizeUrl(article.url);
      if (!original) return null;
      try {
        // Try HEAD first
        let res = await fetchWithTimeout(original, { method: 'HEAD' }, 6000);
        if (res.status === 405 || res.status === 403) {
          // Some sites reject HEAD
          res = await fetchWithTimeout(original, { method: 'GET' }, 9000);
        }
        if (!res.ok && (res.status < 200 || res.status >= 400)) {
          console.warn('URL HEAD/GET not ok', original, res.status);
          return null;
        }

        let finalUrl = res.url || original;
        let html = '';
        // Fetch HTML
        if (res.headers.get('content-type')?.includes('text/html')) {
          try { html = await res.text(); } catch {}
        }
        if (!html) {
          const gr = await fetchWithTimeout(finalUrl, { method: 'GET' }, 9000);
          if (!gr.ok) return null;
          html = await gr.text();
          finalUrl = gr.url || finalUrl;
        }

        const canonical = extractCanonical(html);
        const fixedUrl = normalizeUrl(canonical || finalUrl);
        const pageTitle = extractTitle(html);
        const ok = isTitleMatch(pageTitle, article.title || article.title_kr || '');
        if (!ok) {
          console.warn('Title mismatch - dropping', { fixedUrl, pageTitle, articleTitle: article.title });
          return null;
        }

        return { ...article, url: fixedUrl };
      } catch (e) {
        console.warn('validateAndFixUrl error for', original, e);
        return null;
      }
    };

    const validateArticles = async (articles: any[]) => {
      const results: any[] = [];
      const batchSize = 5;
      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        const validated = await Promise.all(batch.map(validateAndFixUrl));
        for (const v of validated) if (v) results.push(v);
        // tiny delay to be gentle with sites
        await new Promise(r => setTimeout(r, 150));
      }
      return results;
    };

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
      
      const prompt = `Generate ${category.count} news articles about ${category.context} ONLY from real, published sources within the last 30 days.
      
      Return ONLY a strict JSON array with exactly ${category.count} items. Each item must have:
      - title: English headline copied verbatim from the source page
      - title_kr: Natural Korean translation of the title
      - summary: 2-3 sentence Korean summary based on the source article
      - category: "${category.id}"
      - source: publisher name (e.g., Reuters, Bloomberg, TechCrunch)
      - date: YYYY-MM-DD from the article page (UTC)
      - url: the exact canonical URL of the article (not the homepage, not a listing)
      
      Hard requirements:
      - Do not fabricate URLs or sources.
      - Only include articles with publicly accessible pages (HTTP 200).
      - Prefer well-known publishers. Exclude paywalled content if not publicly viewable.
      - No duplicates. Each URL must be unique.
      
      Return ONLY the JSON array, no markdown.`;

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

    console.log(`Total AI articles generated: ${allArticles.length}`);

    // Validate URLs and drop invalid ones
    const validatedArticles = await validateArticles(allArticles);
    console.log(`Validated articles: ${validatedArticles.length}, rejected: ${allArticles.length - validatedArticles.length}`);
    if (validatedArticles.length === 0) {
      throw new Error("No valid articles after URL validation");
    }

    // Clear existing news
    const { error: deleteError } = await supabase.from('news').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) {
      console.error("Error deleting existing news:", deleteError);
      throw deleteError;
    }
    console.log("Existing news cleared successfully");

    // Insert validated news only
    const { error: insertError } = await supabase
      .from('news')
      .insert(validatedArticles.map((article: any) => ({
        title: article.title || "Untitled",
        title_kr: article.title_kr || "제목 없음",
        summary: article.summary || "",
        category: article.category,
        source: article.source || "Unknown",
        date: article.date || new Date().toISOString().split('T')[0],
        url: article.url || "#",
      })) as any);

    if (insertError) {
      console.error("Error inserting news:", insertError);
      throw insertError;
    }

    console.log(`Inserted ${validatedArticles.length} validated news articles (rejected ${allArticles.length - validatedArticles.length}) across ${categories.length} categories`);

    return new Response(
      JSON.stringify({ 
        success: true,
        generated_count: allArticles.length,
        validated_count: validatedArticles.length,
        rejected_count: allArticles.length - validatedArticles.length,
        categories: categories.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error in crawl-news function:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    return new Response(
      JSON.stringify({ error: errorMessage, details: errorDetails }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
