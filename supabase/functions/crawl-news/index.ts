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

        const getHtml = async (u: string) => {
          const res = await fetchWithTimeout(u, { method: 'GET' }, 15000);
          if (!res.ok) return null;
          const ct = res.headers.get('content-type') || '';
          if (!/text\/html/i.test(ct)) return null;
          const html = await res.text();
          return { url: res.url || u, html };
        };

        const looksPaywalled = (html: string) => {
          const s = html.toLowerCase();
          return (
            s.includes("paywall") ||
            s.includes("subscribe to read") ||
            s.includes("subscription required") ||
            s.includes("meteredcontent") ||
            s.includes("regwall") ||
            s.includes("captcha") ||
            s.includes("access denied")
          );
        };

        const strictTitleOk = (html: string) => {
          const pageTitle = extractTitle(html);
          const ogTitle = extractOgTitle(html);
          const h1 = extractH1(html);
          const softTitle = (pageTitle || "").toLowerCase();
          if (!softTitle || softTitle.includes('403') || softTitle.includes('404') || softTitle.includes('forbidden') || softTitle.includes('access denied')) {
            return false;
          }
          return isTitleMatch(pageTitle, ogTitle, h1, article.title || article.title_kr || '');
        };

        const relaxedContentOk = (html: string) => {
          if (looksPaywalled(html)) return false;
          // require an <article> or a reasonably long <h1>
          const hasArticle = /<article[\s>]/i.test(html);
          const h1 = extractH1(html);
          return hasArticle || (h1 && h1.length >= 10);
        };

        // 1) Try original
        let first = await getHtml(original);
        if (!first) return null;

        // 2) Try canonical / og:url / amphtml variants and pick the first that passes strict checks
        const extractHref = (re: RegExp, html: string) => {
          const m = html.match(re);
          if (!m) return null;
          const h = m[0].match(/href=["']([^"']+)["']/i);
          return h ? normalizeUrl(h[1]) : null;
        };

        const canonical = extractHref(/<link[^>]+rel=["']canonical["'][^>]*>/i, first.html);
        const ogUrlMatch = first.html.match(/<meta[^>]+property=["']og:url["'][^>]*>/i);
        const ogUrl = ogUrlMatch ? (ogUrlMatch[0].match(/content=["']([^"']+)["']/i)?.[1] || "") : "";
        const ogUrlNorm = normalizeUrl(ogUrl);
        const ampUrl = extractHref(/<link[^>]+rel=["']amphtml["'][^>]*>/i, first.html);

        const candidates = [canonical, ogUrlNorm, ampUrl]
          .filter(Boolean)
          .map(u => u!)
          .filter(u => !isBlocked(u));

        let finalUrl = first.url;
        let finalHtml = first.html;

        for (const cand of candidates) {
          if (cand === finalUrl) continue;
          const next = await getHtml(cand);
          if (!next) continue;
          if (strictTitleOk(next.html)) {
            finalUrl = next.url;
            finalHtml = next.html;
            break;
          }
        }

        // If strict failed for all, allow a relaxed pass on the best available (prefer canonical if fetched)
        if (!strictTitleOk(finalHtml)) {
          // try relaxed on current html
          if (!relaxedContentOk(finalHtml)) {
            return null;
          }
        }

        if (looksPaywalled(finalHtml)) return null;

        const fixedUrl = normalizeUrl(finalUrl);
        return { ...article, url: fixedUrl };
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
          
          items.push({
            title,
            title_kr: title, // Will be same as title since no AI translation
            summary: description || title,
            category: defaultCategory,
            source: defaultSource,
            date: formattedDate,
            url: link,
          });
        }
      }
      
      return items;
    };

    // Define RSS feeds to crawl
    const feeds = [
      // Google News RSS for Korean EV motor news
      { url: 'https://news.google.com/rss/search?q=전기차+모터+when:7d&hl=ko&gl=KR&ceid=KR:ko', category: '아시아', source: 'Google News KR' },
      // Google News RSS for US EV motor news
      { url: 'https://news.google.com/rss/search?q=electric+vehicle+motor+when:7d&hl=en-US&gl=US&ceid=US:en', category: '북미', source: 'Google News US' },
      // Google News for Korean EV Association
      { url: 'https://news.google.com/rss/search?q=site:keva.or.kr+when:30d&hl=ko&gl=KR&ceid=KR:ko', category: '기타', source: 'KEVA' },
      // Electrek EV RSS
      { url: 'https://electrek.co/guides/electric-vehicles/feed/', category: '기타', source: 'Electrek' },
      // InsideEVs RSS
      { url: 'https://insideevs.com/news/feed/', category: '기타', source: 'InsideEVs' },
    ];

    const allArticles = [];
    const seenUrls = new Set();

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
        const items = parseRssItems(xml, feed.category, feed.source);
        
        console.log(`Found ${items.length} items in ${feed.source}`);
        
        // Add unique items to allArticles
        for (const item of items) {
          const normalizedUrl = normalizeUrl(item.url);
          if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            allArticles.push({ ...item, url: normalizedUrl });
          }
        }
        
        // Small delay between feeds
        await new Promise(resolve => setTimeout(resolve, 500));
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
