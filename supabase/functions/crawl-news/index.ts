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
    // Using public RSS sources and open-access feeds; AI key not required here

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

    const fetchWithTimeout = async (input: string, init: RequestInit = {}, timeoutMs = 12000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(input, {
          method: 'GET',
          redirect: 'follow',
          cache: 'no-store' as RequestCache,
          ...init,
          headers: {
            'User-Agent': DEFAULT_UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
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
      return m ? m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
    };

    const extractCanonical = (html: string): string | null => {
      const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+>/i);
      if (!m) return null;
      const href = m[0].match(/href=["']([^"']+)["']/i);
      return href ? href[1] : null;
    };

    const extractOgTitle = (html: string): string => {
      const m = html.match(/<meta[^>]+property=["']og:title["'][^>]*>/i);
      if (!m) return '';
      const c = m[0].match(/content=["']([^"']+)["']/i);
      return c ? c[1].trim() : '';
    };

    const extractMetaDescription = (html: string): string => {
      const og = html.match(/<meta[^>]+property=["']og:description["'][^>]*>/i);
      let content = '';
      if (og) {
        const c = og[0].match(/content=["']([^"']+)["']/i);
        if (c) content = c[1];
      }
      if (!content) {
        const meta = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
        if (meta) {
          const c = meta[0].match(/content=["']([^"']+)["']/i);
          if (c) content = c[1];
        }
      }
      return content ? decodeHtml(stripHtml(content)).replace(/\s+/g, ' ').trim() : '';
    };

    const stripHtml = (s: string): string => s.replace(/<[^>]*>/g, '');
    const decodeHtml = (s: string): string =>
      s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    const clampSummary = (s: string, maxLen = 220): string => {
      if (s.length <= maxLen) return s;
      return s.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
    };

    const extractH1 = (html: string): string => {
      const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      return m ? m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
    };
    const isTitleMatch = (pageTitle: string, ogTitle: string, h1: string, articleTitle: string): boolean => {
      const ref = (ogTitle || h1 || pageTitle || '').toLowerCase();
      const cand = (articleTitle || '').toLowerCase();
      if (!ref || !cand) return false;
      // quick containment check
      if (ref.includes(cand) || cand.includes(ref)) return true;
      const tokens = cand.split(/[^a-z0-9가-힣]+/i).filter(t => t.length >= 4);
      const hits = tokens.filter(t => ref.includes(t));
      return hits.length >= Math.max(1, Math.ceil(tokens.length * 0.15));
    };

    const validateAndFixUrl = async (article: any) => {
      const original = normalizeUrl(article.url);
      if (!original) return null;

      // Basic domain blocklist to avoid frequent paywalls/blocks
      const blocked = [
        "reuters.com",
        "bloomberg.com",
        "wsj.com",
        "ft.com",
        "nytimes.com",
        "economist.com",
        "caranddriver.com",
        "autonews.com",
        "forbes.com",
        "washingtonpost.com",
        "greencarcongress.com",
        "recyclingmagazine.com"
      ];

      try {
        const isBlocked = (u: string) => {
          try {
            const h = new URL(u).hostname.replace(/^www\./, "");
            return blocked.some(d => h.endsWith(d));
          } catch { return false; }
        };
        if (isBlocked(original)) return null;

        // Resolve redirects to original article and extract a short meta description
        const res = await fetchWithTimeout(original, { method: 'GET' }, 8000).catch(() => null as any);
        if (!res || !res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!/text\/html/i.test(ct)) return null;

        // Final URL after redirects (avoid storing news.google.com redirector)
        let finalUrl = res.url || original;
        try {
          const u = new URL(finalUrl);
          if (u.hostname.endsWith('news.google.com')) {
            // If still on Google, try one more follow (some environments keep url)
            const follow = await fetchWithTimeout(original, { method: 'GET' }, 8000).catch(() => null as any);
            if (follow && follow.ok && /text\/html/i.test(follow.headers.get('content-type') || '')) {
              finalUrl = follow.url || finalUrl;
            }
          }
        } catch {}

        // Read HTML and extract meta description (keep it light)
        const html = await res.text();
        let summary = extractMetaDescription(html) || '';
        if (!summary) {
          const t = extractOgTitle(html) || extractTitle(html) || '';
          summary = t && t !== article.title ? t : '';
        }
        if (!summary) {
          // fallback to cleaned RSS description if provided
          const cleaned = article.summary ? decodeHtml(stripHtml(article.summary)) : '';
          summary = cleaned || article.title || '';
        }
        summary = clampSummary(summary, 260);

        return { ...article, url: finalUrl, summary };
      } catch (e) {
        console.warn('validateAndFixUrl error for', original, e);
        return null;
      }
    };

    const validateArticles = async (articles: any[]) => {
      const results: any[] = [];
      const invalid: any[] = [];
      const batchSize = 5;
      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        const validated = await Promise.all(batch.map(validateAndFixUrl));
        for (let j = 0; j < validated.length; j++) {
          if (validated[j]) {
            results.push(validated[j]);
          } else {
            invalid.push(batch[j]);
          }
        }
        // tiny delay to be gentle with sites
        await new Promise(r => setTimeout(r, 150));
      }
      return { valid: results, invalid };
    };

    // Parse RSS feed and extract articles
    const parseRssItems = (xml: string, defaultCategory: string, defaultSource: string) => {
      const items: any[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      
      while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];
        
        const extractTag = (tag: string) => {
          const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
          const m = itemXml.match(regex);
          return m ? (m[1] || m[2] || '').trim() : '';
        };
        
        const title = extractTag('title');
        const link = extractTag('link');
        const pubDate = extractTag('pubDate');
        const description = extractTag('description');
        
        if (title && link) {
          // Parse date
          let formattedDate = new Date().toISOString().split('T')[0];
          if (pubDate) {
            try {
              formattedDate = new Date(pubDate).toISOString().split('T')[0];
            } catch (e) {
              console.warn('Failed to parse date:', pubDate);
            }
          }

          // Clean summary from RSS (remove HTML/link wrappers)
          const rawSummary = description || title;
          const cleanedSummary = clampSummary(decodeHtml(stripHtml(rawSummary)), 260);
          
          items.push({
            title,
            title_kr: title, // same as title since no AI translation
            summary: cleanedSummary,
            category: defaultCategory,
            source: defaultSource,
            date: formattedDate,
            url: link,
          });
        }
      }
      
      return items;
    };

    // Define RSS feeds to crawl (open-access sources only to avoid blocks)
    const feeds = [
      { url: 'https://electrek.co/guides/electric-vehicles/feed/', category: '기타', source: 'Electrek' },
      { url: 'https://insideevs.com/rss', category: '북미', source: 'InsideEVs' },
      { url: 'https://cleantechnica.com/category/transportation/electric-vehicles/feed/', category: '북미', source: 'CleanTechnica' },
      { url: 'https://www.greencarreports.com/rss', category: '북미', source: 'Green Car Reports' },
    ];

    const allArticles = [];
    const seenUrls = new Set();
    const MAX_PER_FEED = 25;
    const GLOBAL_MAX = 100;

    // Fetch and parse each RSS feed
    for (const feed of feeds) {
      console.log(`Fetching RSS feed: ${feed.source}...`);
      
      try {
        const response = await fetchWithTimeout(feed.url, {}, 15000);
        if (!response.ok) {
          console.error(`Failed to fetch ${feed.source}: ${response.status}`);
          continue;
        }
        
        const xml = await response.text();
        const items = parseRssItems(xml, feed.category, feed.source).slice(0, MAX_PER_FEED);
        
        console.log(`Found ${items.length} items in ${feed.source} (limited to ${MAX_PER_FEED})`);
        
        // Add unique items to allArticles
        for (const item of items) {
          const normalizedUrl = normalizeUrl(item.url);
          if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            allArticles.push({ ...item, url: normalizedUrl });
            if (allArticles.length >= GLOBAL_MAX) {
              console.log(`Reached global cap of ${GLOBAL_MAX} articles, stopping early.`);
              break;
            }
          }
        }
        
        if (allArticles.length >= GLOBAL_MAX) break;
        
        // Small delay between feeds
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error fetching ${feed.source}:`, error);
        continue;
      }
    }

    if (allArticles.length === 0) {
      throw new Error("No articles were generated");
    }

    console.log(`Total articles collected from feeds: ${allArticles.length}`);

    // Validate URLs - keep both validated and invalid articles for logging only
    const { valid, invalid } = await validateArticles(allArticles);
    console.log(`Validated articles: ${valid.length}, rejected: ${invalid.length}`);
    
    if (valid.length === 0) {
      throw new Error("No valid articles after URL validation");
    }

    console.log(`Inserting ${valid.length} validated articles`);

    // De-duplicate by URL and upsert
    const uniqueValidated = Array.from(new Map(valid.map((a: any) => [a.url, a])).values());

    const { error: upsertError } = await supabase
      .from('news')
      .upsert(uniqueValidated.map((article: any) => ({
        title: article.title || 'Untitled',
        title_kr: article.title_kr || '제목 없음',
        summary: article.summary || '',
        category: article.category,
        source: article.source || 'Unknown',
        date: article.date || new Date().toISOString().split('T')[0],
        url: article.url || '#',
      })) as any, { onConflict: 'url' } as any);

    if (upsertError) {
      console.error('Error upserting news:', upsertError);
      throw upsertError;
    }

    // Optional cleanup: remove very old news (> 60 days) to keep table fresh
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const { error: cleanupError } = await supabase
      .from('news')
      .delete()
      .lt('date', cutoffStr);
    if (cleanupError) console.warn('Cleanup old news failed:', cleanupError);

    // Aggregator cleanup no longer needed since we avoid Google News feeds

    console.log(`Upserted ${uniqueValidated.length} news articles (${valid.length} validated, ${invalid.length} unvalidated)`);

    return new Response(
      JSON.stringify({ 
        success: true,
        collected_count: allArticles.length,
        validated_count: valid.length,
        invalid_count: invalid.length,
        upserted_count: uniqueValidated.length
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
