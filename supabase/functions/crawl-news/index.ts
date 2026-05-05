import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth check: only allow requests with valid project keys
  const authHeader = req.headers.get('Authorization');
  const apikeyHeader = req.headers.get('apikey') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader?.replace('Bearer ', '') || '';
  const authorized = token === anonKey || token === serviceKey || apikeyHeader === anonKey || apikeyHeader === serviceKey;
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  console.log("Starting news crawling process...");
  
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = serviceKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
      throw new Error("Required credentials not found");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const DEFAULT_UA = 'Mozilla/5.0 (compatible; LovableNewsBot/1.0)';

    const normalizeUrl = (raw: string): string => {
      try {
        let u = (raw || '').trim();
        if (!u) return '';
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        const url = new URL(u);
        url.hash = '';
        return url.toString();
      } catch { return ''; }
    };

    const fetchWithTimeout = async (input: string, init: RequestInit = {}, timeoutMs = 12000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(input, {
          ...init,
          headers: { 'User-Agent': DEFAULT_UA, ...(init.headers || {}) },
          signal: controller.signal,
        });
        return res;
      } finally {
        clearTimeout(id);
      }
    };

    const stripHtml = (s: string): string => s.replace(/<[^>]*>/g, '');
    const decodeHtml = (s: string): string =>
      s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#039;/g, "'");

    const clampSummary = (s: string, maxLen = 220): string => {
      if (s.length <= maxLen) return s;
      return s.slice(0, maxLen).slice(0, s.slice(0, maxLen).lastIndexOf(' ')) + '...';
    };

    const extractMetaDescription = (html: string): string => {
      const og = html.match(/<meta[^>]+property=["']og:description["'][^>]*>/i);
      let content = '';
      if (og) {
        const c = og[0].match(/content=["']([^"']+)["']/i);
        if (c) content = c[1];
      }
      return content ? decodeHtml(stripHtml(content)).trim() : '';
    };

     const isBlockedHtml = (html: string) => /404|not found|page not found|403|access denied|forbidden|captcha|enable javascript|subscribe to continue/i.test(html.slice(0, 4000));

     const validateAndFixUrl = async (article: any) => {
      const original = normalizeUrl(article.url);
      if (!original) return null;

      try {
        const res = await fetchWithTimeout(original, { method: 'GET' }, 8000).catch(() => null as any);
        if (!res || !res.ok) return null;
        
        const html = await res.text();
        if (isBlockedHtml(html)) return null;
        let summary = extractMetaDescription(html) || article.summary || article.title;
        summary = clampSummary(decodeHtml(stripHtml(summary)), 260);

        const text = decodeHtml(stripHtml(html)).toLowerCase();
        const titleHint = article.title.toLowerCase().replace(/[^a-z0-9가-힣\s]/gi, ' ').replace(/\s+/g, ' ').trim();
        if (titleHint.length >= 8 && !text.includes(titleHint.slice(0, Math.min(titleHint.length, 80)))) return null;

        return { ...article, url: res.url || original, summary, linkVerified: true, linkStatus: res.status, linkBlockedReason: null };
      } catch {
        return null;
      }
    };

    const parseRssItems = (xml: string) => {
      const items: any[] = [];
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];
        const getTag = (tag: string) => {
          const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
          return m ? decodeHtml(stripHtml(m[1])).trim() : '';
        };

        const title = getTag('title');
        const link = getTag('link') || getTag('guid');
        const pubDate = getTag('pubDate') || getTag('published');
        const description = getTag('description');

        if (title && link) {
          let formattedDate = new Date().toISOString().split('T')[0];
          if (pubDate) {
            try { formattedDate = new Date(pubDate).toISOString().split('T')[0]; } catch {}
          }

          items.push({ title, url: link, date: formattedDate, summary: description });
        }
      }
      return items;
    };

    const classifyAndTranslate = async (articles: any[]) => {
      const batchSize = 10;
      const processed: any[] = [];
      
      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        
        try {
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `Analyze news articles and select all relevant categories, then translate title to Korean.

Categories: Asia, Europe, North America, China, GM, Ford, Mercedes-Benz, BMW, Volkswagen, Honda, Hyundai, Stellantis, Toyota, Tesla, Nissan, Renault, BYD, Xiaomi, Geely, Bosch, ZF, Schaeffler, LG Magna, Denso, Magna, Hyundai Mobis, AISIN, BorgWarner, Hitachi Astemo, Other

Important: 
- Select MULTIPLE categories if the article is relevant to more than one
- PRIORITIZE articles about customers (GM, Ford, Mercedes-Benz, BMW, Volkswagen, Honda, Hyundai, Stellantis, Toyota, Tesla, Nissan, Renault, BYD, Xiaomi, Geely) and motor manufacturers (Bosch, ZF, Schaeffler, LG Magna, Denso, Magna, Hyundai Mobis, AISIN, BorgWarner, Hitachi Astemo)
- Example: Mercedes EV article in Europe → ["Europe", "Mercedes-Benz"]
- Example: Bosch motor tech in North America → ["North America", "Bosch"]`
                },
                {
                  role: "user",
                  content: JSON.stringify(batch.map((a, idx) => ({ index: idx, title: a.title, summary: a.summary || '' })))
                }
              ],
              tools: [{
                type: "function",
                function: {
                  name: "classify_articles",
                  parameters: {
                    type: "object",
                    properties: {
                      results: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            index: { type: "number" },
                            categories: { 
                              type: "array",
                              items: { type: "string" },
                              description: "관련된 모든 카테고리 배열"
                            },
                            title_kr: { type: "string" }
                          },
                          required: ["index", "categories", "title_kr"]
                        }
                      }
                    },
                    required: ["results"]
                  }
                }
              }],
              tool_choice: { type: "function", function: { name: "classify_articles" } }
            }),
          });

          if (!response.ok) {
            for (const article of batch) {
              processed.push({ ...article, category: ["Other"], title_kr: article.title });
            }
            continue;
          }

          const data = await response.json();
          const result = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || '{"results":[]}');
            
          for (const cls of result.results || []) {
            const article = batch[cls.index];
            if (article) {
              const categories = Array.isArray(cls.categories) && cls.categories.length > 0 ? cls.categories : ["Other"];
              processed.push({ ...article, category: categories, title_kr: cls.title_kr || article.title });
            }
          }
        } catch {
          for (const article of batch) {
            processed.push({ ...article, category: ["Other"], title_kr: article.title });
          }
        }
      }
      
      return processed;
    };

    const feeds = [
      { name: 'Electrek', url: 'https://electrek.co/feed/' },
      { name: 'InsideEVs', url: 'https://insideevs.com/feed/' },
      { name: 'CleanTechnica', url: 'https://cleantechnica.com/feed/' },
      { name: 'Green Car Reports', url: 'https://www.greencarreports.com/rss/all' },
      { name: 'Automotive News', url: 'https://www.autonews.com/rss' },
      { name: 'Google News EV Motor', url: 'https://news.google.com/rss/search?q=electric+vehicle+motor+technology+BMW+Mercedes+Volkswagen+Hyundai+Bosch+ZF&hl=en-US&gl=US&ceid=US:en' },
      { name: 'Automotive World', url: 'https://www.automotiveworld.com/feed/' },
      { name: 'EV Magazine', url: 'https://evmagazine.com/feed' },
      { name: 'Power Electronics News', url: 'https://www.powerelectronicsnews.com/feed/' },
    ];

    const collectedArticles: any[] = [];
    const seenUrls = new Set<string>();

    for (const feed of feeds) {
      if (collectedArticles.length >= 300) break;
      
      try {
        console.log(`Fetching: ${feed.name}`);
        const res = await fetchWithTimeout(feed.url, {}, 10000);
        if (!res.ok) continue;

        const xml = await res.text();
        const items = parseRssItems(xml);

        for (const item of items.slice(0, 50)) {
          if (collectedArticles.length >= 300) break;
          const url = normalizeUrl(item.url);
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            collectedArticles.push({ ...item, url, source: feed.name });
          }
        }
      } catch {}
    }

    console.log(`Collected: ${collectedArticles.length}`);

    const validated = [];
    for (let i = 0; i < collectedArticles.length; i += 5) {
      const batch = await Promise.all(collectedArticles.slice(i, i + 5).map(validateAndFixUrl));
      validated.push(...batch.filter(Boolean));
    }

    console.log(`Validated: ${validated.length}`);

    if (validated.length === 0) {
      return new Response(JSON.stringify({ success: true, upserted: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const classified = await classifyAndTranslate(validated);
    console.log(`Classified: ${classified.length}`);

    await supabase.from('news').upsert(
      classified.map(a => ({
        title: a.title,
        title_kr: a.title_kr,
        summary: a.summary,
        url: a.url,
        date: a.date,
        category: a.category,
        source: a.source,
        link_verified: a.linkVerified ?? true,
        link_status: a.linkStatus ?? null,
        link_blocked_reason: a.linkBlockedReason ?? null,
        resolved_url: a.url,
        link_verified_at: new Date().toISOString(),
      })),
      { onConflict: 'url' }
    );

    console.log(`Upserted: ${classified.length}`);

    // Auto-trigger all analytics functions after crawling
    const fnUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;
    const fnHeaders = { 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
    const analysisFunctions = ['analyze-news', 'analyze-dashboard', 'analyze-market-data'];

    try {
      const triggerResults = await Promise.allSettled(
        analysisFunctions.map((name) => fetch(fnUrl(name), { method: 'POST', headers: fnHeaders }))
      );

      triggerResults.forEach((result, index) => {
        const fn = analysisFunctions[index];
        if (result.status === 'fulfilled') {
          console.log(`Auto-triggered ${fn}: ${result.value.status}`);
        } else {
          console.error(`Failed to auto-trigger ${fn}:`, result.reason);
        }
      });

      console.log('Analytics functions trigger completed');
    } catch (e) {
      console.error('Error triggering analyses:', e);
    }

    return new Response(
      JSON.stringify({ success: true, upserted: classified.length }),
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