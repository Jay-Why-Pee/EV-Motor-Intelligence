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

     const WRAPPER_HOST_RE = /(^|\.)(google|bing|yahoo|duckduckgo|baidu|yandex)\.[a-z.]+$/i;
     const isWrapperUrl = (u: string) => {
       try {
         const host = new URL(u).hostname.toLowerCase();
         return WRAPPER_HOST_RE.test(host) || host === 'news.google.com';
       } catch { return true; }
     };

     const isBlockedHtml = (html: string) => /404|not found|page not found|403|access denied|forbidden|captcha|enable javascript|subscribe to continue/i.test(html.slice(0, 4000));

     const validateAndFixUrl = async (article: any) => {
      const original = normalizeUrl(article.url);
      if (!original || isWrapperUrl(original)) return null;

      try {
        const res = await fetchWithTimeout(original, { method: 'GET', redirect: 'follow' }, 10000).catch(() => null as any);
        if (!res || !res.ok || res.status >= 400) return null;
        const finalUrl = res.url || original;
        if (isWrapperUrl(finalUrl)) return null;

        const html = await res.text();
        if (isBlockedHtml(html)) return null;
        let summary = extractMetaDescription(html) || article.summary || article.title;
        summary = clampSummary(decodeHtml(stripHtml(summary)), 260);

        // Loose title match: require ≥3 of first 5 significant words to appear
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣\s]/gi, ' ').replace(/\s+/g, ' ').trim();
        const text = norm(decodeHtml(stripHtml(html)));
        const titleHint = norm(article.title);
        if (titleHint.length >= 12) {
          const words = titleHint.split(' ').filter(w => w.length >= 3).slice(0, 5);
          if (words.length >= 3) {
            const hits = words.filter(w => text.includes(w)).length;
            if (hits < 3) return null;
          }
        }

        return { ...article, url: finalUrl, summary, linkVerified: true, linkStatus: res.status, linkBlockedReason: null };
      } catch {
        return null;
      }
    };

    const decodeGoogleNewsUrl = (url: string): string | null => {
      try {
        const m = url.match(/\/rss\/articles\/([^?/]+)/);
        if (!m) return null;
        let b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const bin = atob(b64);
        const idx = bin.indexOf('http');
        if (idx < 0) return null;
        let end = idx;
        while (end < bin.length) {
          const c = bin.charCodeAt(end);
          if (c < 32 || c > 126) break;
          end++;
        }
        const candidate = bin.slice(idx, end);
        if (/^https?:\/\/[^\s]+/i.test(candidate)) return candidate;
        return null;
      } catch { return null; }
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
        let link = getTag('link') || getTag('guid');
        const pubDate = getTag('pubDate') || getTag('published');
        const description = getTag('description');

        // Extract <source url="..."> attribute (Google News includes publisher URL here)
        const sourceUrlMatch = itemXml.match(/<source[^>]*\burl=["']([^"']+)["']/i);
        const sourceUrl = sourceUrlMatch ? sourceUrlMatch[1] : '';

        // If Google News wrapper, try to unwrap to real publisher URL
        if (link && /news\.google\.com\/rss\/articles\//i.test(link)) {
          const decoded = decodeGoogleNewsUrl(link);
          if (decoded) {
            link = decoded;
          } else if (sourceUrl && /^https?:\/\//i.test(sourceUrl) && !/news\.google\.com/i.test(sourceUrl)) {
            link = sourceUrl;
          } else {
            // Last resort: pull first http URL from description
            const descUrl = (description || '').match(/https?:\/\/[^\s"'<>)]+/i);
            if (descUrl && !/news\.google\.com/i.test(descUrl[0])) link = descUrl[0];
          }
        }

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


    const CATEGORY_WHITELIST = new Set([
      "Asia","Europe","North America","China","GM","Ford","Mercedes-Benz","BMW","Volkswagen","Honda","Hyundai","Stellantis","Toyota","Tesla","Nissan","Renault","BYD","Xiaomi","Geely","Bosch","ZF","Schaeffler","LG Magna","Denso","Magna","Hyundai Mobis","AISIN","BorgWarner","Hitachi Astemo","Other"
    ]);
    const CATEGORY_ALIASES: Record<string, string> = {
      "기타": "Other", "북미": "North America", "유럽": "Europe", "아시아": "Asia", "중국": "China",
      "테슬라": "Tesla", "폭스바겐": "Volkswagen", "현대/기아": "Hyundai", "현대": "Hyundai", "기아": "Hyundai",
      "벤츠": "Mercedes-Benz", "Kia": "Hyundai", "Volvo": "Other", "Daimler Truck": "Other",
    };
    const normalizeCategories = (cats: any): string[] => {
      if (!Array.isArray(cats)) return ["Other"];
      const mapped = cats
        .map((c: any) => String(c || "").trim())
        .map((c: string) => CATEGORY_ALIASES[c] || c)
        .filter((c: string) => CATEGORY_WHITELIST.has(c));
      const uniq = Array.from(new Set(mapped));
      return uniq.length > 0 ? uniq : ["Other"];
    };

    // Deterministic rule-based tagger — runs BEFORE AI. Guarantees supplier
    // and OEM tagging when name/URL matches, so short RSS summaries can't hide them.
    const COMPANY_RULES: { cat: string; pattern: RegExp; domains?: string[] }[] = [
      { cat: "Bosch",           pattern: /\bBosch\b/i,                                 domains: ["bosch.com","bosch-mobility.com","bosch-presse.de"] },
      { cat: "ZF",              pattern: /\bZF\s+(Friedrichshafen|Group|AG)\b|\bZF\b(?=\s+(said|announced|develops|unveil|supplies|launched|partners|acquires|invests|will|has|is|to|electric|e-drive|drive))|(?<=\bfrom\s)ZF\b|(?<=\bby\s)ZF\b/i, domains: ["zf.com","press.zf.com"] },
      { cat: "Schaeffler",      pattern: /\bSchaeffler\b/i,                            domains: ["schaeffler.com"] },
      { cat: "LG Magna",        pattern: /\bLG\s*Magna\b|\bLG\s+Magna\s+e-?Powertrain\b/i },
      { cat: "Denso",           pattern: /\bDenso\b/i,                                 domains: ["denso.com"] },
      { cat: "Magna",           pattern: /\bMagna\s+International\b|\bMagna\b(?!\s*Carta)/i, domains: ["magna.com"] },
      { cat: "Hyundai Mobis",   pattern: /\bHyundai\s+Mobis\b|\bMobis\b/i,             domains: ["mobis.com","mobis.co.kr"] },
      { cat: "AISIN",           pattern: /\bAisin\b/i,                                 domains: ["aisin.com"] },
      { cat: "BorgWarner",      pattern: /\bBorg\s*Warner\b/i,                         domains: ["borgwarner.com"] },
      { cat: "Hitachi Astemo",  pattern: /\bHitachi\s+Astemo\b/i,                      domains: ["hitachiastemo.com"] },
      // OEMs
      { cat: "Tesla",           pattern: /\bTesla\b/i,                                 domains: ["tesla.com"] },
      { cat: "BYD",             pattern: /\bBYD\b/i },
      { cat: "Hyundai",         pattern: /\bHyundai\b|\bKia\b|\bGenesis\b/i,           domains: ["hyundai.com","kia.com"] },
      { cat: "GM",              pattern: /\bGeneral\s+Motors\b|\bGM\b|\bChevrolet\b|\bCadillac\b|\bGMC\b/i, domains: ["gm.com"] },
      { cat: "Ford",            pattern: /\bFord\b/i,                                  domains: ["ford.com"] },
      { cat: "Volkswagen",      pattern: /\bVolkswagen\b|\bVW\b|\bAudi\b|\bPorsche\b|\bSkoda\b|\bSEAT\b/i, domains: ["volkswagen.com","vw.com"] },
      { cat: "Mercedes-Benz",   pattern: /\bMercedes(-Benz)?\b|\bDaimler\b/i,          domains: ["mercedes-benz.com"] },
      { cat: "BMW",             pattern: /\bBMW\b|\bMINI\b/i,                          domains: ["bmw.com","bmwgroup.com"] },
      { cat: "Toyota",          pattern: /\bToyota\b|\bLexus\b/i,                      domains: ["toyota.com"] },
      { cat: "Stellantis",      pattern: /\bStellantis\b|\bJeep\b|\bChrysler\b|\bDodge\b|\bRam\b|\bFiat\b|\bPeugeot\b|\bCitro[eë]n\b|\bOpel\b|\bMaserati\b|\bAlfa\s+Romeo\b/i, domains: ["stellantis.com"] },
      { cat: "Nissan",          pattern: /\bNissan\b|\bInfiniti\b/i,                   domains: ["nissan.com"] },
      { cat: "Renault",         pattern: /\bRenault\b/i,                               domains: ["renault.com"] },
      { cat: "Honda",           pattern: /\bHonda\b|\bAcura\b/i,                       domains: ["honda.com"] },
      { cat: "Xiaomi",          pattern: /\bXiaomi\b/i },
      { cat: "Geely",           pattern: /\bGeely\b|\bZeekr\b|\bLynk\s*&\s*Co\b|\bPolestar\b|\bVolvo\s+Cars?\b/i },
    ];
    const REGION_RULES: { cat: string; pattern: RegExp }[] = [
      { cat: "China",         pattern: /\bChina\b|\bChinese\b|\bBeijing\b|\bShanghai\b|\bShenzhen\b/i },
      { cat: "North America", pattern: /\b(U\.?S\.?A?|United\s+States|America(n)?|Canada|Mexico|Detroit|Michigan|California|Texas)\b/i },
      { cat: "Europe",        pattern: /\bEurope(an)?|Germany|German|France|French|UK|Britain|British|Italy|Spain|Netherlands|Sweden|Norway|EU\b/i },
      { cat: "Asia",          pattern: /\bJapan(ese)?|Korea(n)?|Seoul|Tokyo|Taiwan|India(n)?|Vietnam|Thailand/i },
    ];

    const applyRuleTags = (article: { title: string; summary?: string; url?: string }): string[] => {
      const text = `${article.title || ''} ${article.summary || ''}`;
      let host = '';
      try { host = new URL(article.url || '').hostname.toLowerCase(); } catch {}
      const tags = new Set<string>();
      for (const r of COMPANY_RULES) {
        if (r.pattern.test(text)) tags.add(r.cat);
        else if (host && r.domains && r.domains.some(d => host === d || host.endsWith('.' + d))) tags.add(r.cat);
      }
      for (const r of REGION_RULES) {
        if (r.pattern.test(text)) tags.add(r.cat);
      }
      return Array.from(tags);
    };

    const classifyAndTranslate = async (articles: any[]) => {
      const batchSize = 10;
      const processed: any[] = [];

      // Pre-compute rule tags for every article
      const ruleTagsByIndex = articles.map(applyRuleTags);

      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        const batchRuleTags = ruleTagsByIndex.slice(i, i + batchSize);

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

Rules:
- Each article comes with "confirmed_tags" already validated by keyword/domain matching. You MUST keep every confirmed tag AND add any additional relevant categories.
- MULTI-tag: assign every relevant company + region. If a supplier (Bosch/ZF/Schaeffler/LG Magna/Denso/Magna/Hyundai Mobis/AISIN/BorgWarner/Hitachi Astemo) is mentioned in any substantive way (product, tech, partnership, financials, supply), tag it.
- Use "Other" ONLY when no company AND no region applies.`
                },
                {
                  role: "user",
                  content: JSON.stringify(batch.map((a, idx) => ({
                    index: idx,
                    title: a.title,
                    summary: a.summary || '',
                    confirmed_tags: batchRuleTags[idx],
                  })))
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
                              description: "관련된 모든 카테고리 배열 (confirmed_tags 포함 필수)"
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
            for (let j = 0; j < batch.length; j++) {
              const article = batch[j];
              const rt = batchRuleTags[j];
              processed.push({ ...article, category: normalizeCategories(rt.length ? rt : ["Other"]), title_kr: article.title });
            }
            continue;
          }

          const data = await response.json();
          const result = JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || '{"results":[]}');

          const seenIdx = new Set<number>();
          for (const cls of result.results || []) {
            const article = batch[cls.index];
            if (article) {
              seenIdx.add(cls.index);
              // Union AI tags with confirmed rule tags — rule tags always win
              const merged = normalizeCategories([...(cls.categories || []), ...batchRuleTags[cls.index]]);
              processed.push({ ...article, category: merged, title_kr: cls.title_kr || article.title });
            }
          }
          // Any batch item missed by AI still gets rule-based tags
          for (let j = 0; j < batch.length; j++) {
            if (seenIdx.has(j)) continue;
            const article = batch[j];
            const rt = batchRuleTags[j];
            processed.push({ ...article, category: normalizeCategories(rt.length ? rt : ["Other"]), title_kr: article.title });
          }
        } catch {
          for (let j = 0; j < batch.length; j++) {
            const article = batch[j];
            const rt = batchRuleTags[j];
            processed.push({ ...article, category: normalizeCategories(rt.length ? rt : ["Other"]), title_kr: article.title });
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
      { name: 'Automotive World', url: 'https://www.automotiveworld.com/feed/' },
      { name: 'EV Magazine', url: 'https://evmagazine.com/feed' },
      { name: 'Power Electronics News', url: 'https://www.powerelectronicsnews.com/feed/' },
    ];

    // MAJOR companies to actively seed via targeted Google News RSS.
    const MAJOR_MANUFACTURERS = [
      'Bosch', 'ZF', 'Schaeffler', 'LG Magna', 'Denso', 'Magna',
      'Hyundai Mobis', 'AISIN', 'BorgWarner', 'Hitachi Astemo',
      'Nidec', 'Vitesco', 'Valeo',
    ];
    const MAJOR_OEMS = [
      'Tesla', 'BYD', 'Hyundai', 'GM', 'Ford', 'Volkswagen',
      'Mercedes-Benz', 'BMW', 'Toyota', 'Stellantis', 'Xiaomi', 'Geely',
      'Honda', 'Nissan', 'Renault',
    ];

    const buildGoogleNewsRss = (q: string) =>
      `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en&when:180d`;

    // 2 targeted queries per manufacturer + 1 per OEM
    const majorFeeds = [
      ...MAJOR_MANUFACTURERS.flatMap((c) => [
        { name: `GN:${c} motor`, url: buildGoogleNewsRss(`"${c}" (electric motor OR traction motor OR e-motor OR e-axle)`) },
        { name: `GN:${c} EV`, url: buildGoogleNewsRss(`"${c}" ("drive unit" OR inverter OR "EV drive" OR "electric drive")`) },
      ]),
      ...MAJOR_OEMS.map((c) => (
        { name: `GN:${c}`, url: buildGoogleNewsRss(`"${c}" (electric motor OR traction motor OR e-axle OR "drive unit")`) }
      )),
    ];

    const collectedArticles: any[] = [];
    const seenUrls = new Set<string>();

    // Parallel fetch of all RSS feed XMLs with a concurrency limit.
    // Skip Google News redirect resolution here — validateAndFixUrl follows
    // redirects and returns the final publisher URL, so we dedup post-validate.
    const runWithLimit = async <T,>(items: T[], limit: number, worker: (t: T) => Promise<void>) => {
      let idx = 0;
      const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (idx < items.length) {
          const my = idx++;
          await worker(items[my]);
        }
      });
      await Promise.all(runners);
    };

    const fetchFeedItems = async (feed: { name: string; url: string }, perFeedCap: number) => {
      try {
        const res = await fetchWithTimeout(feed.url, {}, 10000);
        if (!res.ok) return;
        const xml = await res.text();
        const items = parseRssItems(xml).slice(0, perFeedCap);
        for (const item of items) {
          if (collectedArticles.length >= 800) return;
          const url = normalizeUrl(item.url);
          if (!url || seenUrls.has(url)) continue;
          seenUrls.add(url);
          collectedArticles.push({ ...item, url, source: feed.name.startsWith('GN:') ? feed.name.slice(3) : feed.name });
        }
      } catch {}
    };

    console.log(`Fetching ${majorFeeds.length} major-company feeds in parallel...`);
    await runWithLimit(majorFeeds, 8, (f) => fetchFeedItems(f, 15));
    console.log(`After major feeds: ${collectedArticles.length}`);

    console.log(`Fetching ${feeds.length} generic feeds in parallel...`);
    await runWithLimit(feeds, 6, (f) => fetchFeedItems(f, 40));


    console.log(`Collected: ${collectedArticles.length}`);

    // Parallel validate (concurrency 15), then dedup by final resolved URL.
    const validated: any[] = [];
    const finalSeen = new Set<string>();
    await runWithLimit(collectedArticles, 15, async (a) => {
      const v = await validateAndFixUrl(a);
      if (!v) return;
      const key = normalizeUrl(v.url);
      if (!key || finalSeen.has(key)) return;
      finalSeen.add(key);
      validated.push(v);
    });

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