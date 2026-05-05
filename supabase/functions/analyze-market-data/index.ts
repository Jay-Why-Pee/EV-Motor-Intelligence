import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_UA = 'Mozilla/5.0 (compatible; LovableLinkVerifier/1.0)';

const normalizeUrl = (raw: string): string => {
  try {
    let value = (raw || '').trim();
    if (!value) return '';
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
};

const fetchWithTimeout = async (input: string, init: RequestInit = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      redirect: 'follow',
      headers: { 'User-Agent': DEFAULT_UA, Accept: 'text/html,application/xhtml+xml', ...(init.headers || {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
};

const extractVisibleText = (html: string) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

/** Hosts that return wrapper/search/redirect pages — never treat as verified original content */
const wrapperHosts = [
  'google.com', 'www.google.com', 'news.google.com',
  'bing.com', 'www.bing.com',
  'yahoo.com', 'search.yahoo.com',
  'duckduckgo.com',
  'patents.google.com', // blocks COOP/COEP headers
];

const isWrapperUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return wrapperHosts.some(w => host === w || host.endsWith('.' + w));
  } catch { return false; }
};

const blockedPatterns = [
  /404/i,
  /not found/i,
  /page not found/i,
  /403/i,
  /access denied/i,
  /forbidden/i,
  /bot detection/i,
  /captcha/i,
  /enable javascript/i,
  /subscribe to continue/i,
  /paywall/i,
];

const verifyExternalLink = async (inputUrl?: string, titleHints: string[] = []) => {
  const original = normalizeUrl(inputUrl || '');
  if (!original) {
    return { url: '', linkVerified: false, linkStatus: null, linkBlockedReason: 'invalid_url' };
  }

  // Reject wrapper/search/redirect URLs
  if (isWrapperUrl(original)) {
    return { url: '', linkVerified: false, linkStatus: null, linkBlockedReason: 'wrapper_url' };
  }

  try {
    const res = await fetchWithTimeout(original, {}, 12000);
    const finalUrl = normalizeUrl(res.url || original);

    // Check if redirected to a wrapper
    if (isWrapperUrl(finalUrl)) {
      return { url: '', linkVerified: false, linkStatus: res.status, linkBlockedReason: 'wrapper_redirect' };
    }

    if (!res.ok) {
      return {
        url: '',
        linkVerified: false,
        linkStatus: res.status,
        linkBlockedReason: res.status === 404 ? 'not_found' : res.status === 403 ? 'blocked' : 'unreachable',
      };
    }

    const html = await res.text();
    const text = extractVisibleText(html).toLowerCase();
    if (blockedPatterns.some((pattern) => pattern.test(text.slice(0, 4000)))) {
      return { url: '', linkVerified: false, linkStatus: res.status, linkBlockedReason: res.status === 404 ? 'not_found' : 'blocked' };
    }

    const normalizedHints = titleHints
      .map((hint) => hint.toLowerCase().replace(/[^a-z0-9가-힣\s]/gi, ' ').replace(/\s+/g, ' ').trim())
      .filter((hint) => hint.length >= 6);
    const contentMatched = normalizedHints.length === 0 || normalizedHints.some((hint) => text.includes(hint.slice(0, Math.min(hint.length, 80))));
    if (!contentMatched) {
      return { url: '', linkVerified: false, linkStatus: res.status, linkBlockedReason: 'content_mismatch' };
    }

    return { url: finalUrl, linkVerified: true, linkStatus: res.status, linkBlockedReason: null };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { url: '', linkVerified: false, linkStatus: null, linkBlockedReason: 'timeout' };
    }
    return { url: '', linkVerified: false, linkStatus: null, linkBlockedReason: 'unreachable' };
  }
};

const likelyFakePatentNumber = (value?: string) => {
  const normalized = (value || '').replace(/\s+/g, '').toUpperCase();
  if (!normalized) return true;
  if (/^(123456|654321|111111|222222|333333|999999)$/.test(normalized)) return true;
  if (/([0-9])\1{5,}/.test(normalized)) return true;
  if (!/^(US|EP|CN|JP|KR|WO|DE|FR|GB)\d{4,}/i.test(normalized)) return true;
  return false;
};

const verifyPatentEntry = async (patent: any) => {
  const patentNumber = String(patent?.patentNumber || '').trim();
  if (likelyFakePatentNumber(patentNumber)) {
    return null;
  }

  // Try to verify the AI-provided link first
  if (patent?.link && /^https?:\/\//i.test(patent.link)) {
    const verified = await verifyExternalLink(patent.link, [patent.title || '', patentNumber]);
    if (verified.linkVerified) {
      return {
        ...patent,
        link: verified.url,
        patentNumber,
        linkVerified: true,
        linkStatus: verified.linkStatus,
        linkBlockedReason: null,
      };
    }
  }

  // If no valid link, keep the patent data but mark link as unverified
  return {
    ...patent,
    link: '',
    patentNumber,
    linkVerified: false,
    linkStatus: null,
    linkBlockedReason: 'no_verified_source',
  };
};


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const apikeyHeader = req.headers.get('apikey') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const token = authHeader?.replace('Bearer ', '') || '';
  const authorized = token === anonKey || token === serviceKey || apikeyHeader === anonKey || apikeyHeader === serviceKey;
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('Starting market data analysis...');

    // Fetch recent news
    const { data: newsData, error: newsError } = await supabase
      .from('news').select('*').order('date', { ascending: false }).limit(100);
    if (newsError) throw newsError;
    if (!newsData || newsData.length === 0) {
      return new Response(JSON.stringify({ error: 'No news to analyze' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch existing research & patents for accumulation
    const { data: existingResearch } = await supabase
      .from('market_analysis').select('content').eq('type', 'research').maybeSingle();
    const { data: existingPatents } = await supabase
      .from('market_analysis').select('content').eq('type', 'patents').maybeSingle();

    const existingPapers = (existingResearch?.content as any)?.papers || [];
    const existingPatentsList = (existingPatents?.content as any)?.patents || [];

    const newsSummary = newsData.map(a =>
      `[${a.category?.join(', ')}] ${a.title_kr}\n${a.summary}\n출처: ${a.source} (${a.date})`
    ).join('\n\n');

    const callAI = async (systemPrompt: string, userPrompt: string) => {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 6000,
        }),
      });
      if (!res.ok) throw new Error(`AI error: ${res.status}`);
      const data = await res.json();
      let content = data.choices[0].message.content;
      content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found');
      return JSON.parse(match[0]);
    };

    // 1. Charts/KPI
    console.log('Generating charts data...');
    const chartsData = await callAI(
      `당신은 전기차 모터 시장 데이터 분석 전문가입니다. 뉴스 기사들을 기반으로 시장 데이터를 추출/추정하여 JSON으로 제공하세요.
반드시 다음 JSON 구조로 응답:
{
  "kpis": [{ "title": "KPI명", "value": "값", "change": "변화율", "trend": "up|down", "source": "출처", "sourceUrl": "URL" }],
  "marketSize": [{ "year": "2020", "market": 28.5, "forecast": 28.5 }],
  "regionalShare": [{ "name": "지역명", "value": 38.5 }],
  "technologyTrend": [{ "tech": "기술명", "adoption": 62, "growth": 8.5 }],
  "lastUpdated": "YYYY-MM-DD"
}
KPI는 정확히 4개. marketSize는 2020~2028년. regionalShare는 5개 지역. technologyTrend는 4~5개.`,
      `최근 ${newsData.length}개의 전기차 모터 관련 뉴스:\n\n${newsSummary}\n\n최신 시장 데이터를 JSON으로 제공해주세요.`
    );

    // 2. Research Insights (no individual papers - AI cannot provide real links)
    console.log('Generating research insights...');
    const researchData = await callAI(
      `당신은 전기차 **모터(Motor)** 기술 연구 전문가입니다. 뉴스에서 언급된 기술 트렌드를 기반으로 **모터 기술 연구 동향 인사이트**를 분석하세요.

⚠️ 반드시 모터 기술만 포함:
- ✅ 포함: IPMSM, EESM, Axial Flux, Hairpin Winding, Rotor/Stator 설계, 모터 냉각, NVH, 모터 토크/출력, 감속기, 모터 제어, 모터 재료(전기강판, 영구자석, Dy-free), 모터 제조공정, 코일 권선, 모터 효율
- ❌ 제외: 인버터, SiC/GaN 반도체, 배터리, BMS, 충전, V2G, 자율주행, ADAS, 연료전지, 수소, 전력전자, DC-DC 컨버터, OBC, 열관리시스템(모터 냉각 제외)

반드시 다음 JSON 구조로 응답:
{
  "insights": [
    { "title": "인사이트 제목", "content": "분석 내용 (5-8문장, 구체적 기업/수치/기술 포함)" }
  ],
  "searchKeywords": [
    { "keyword": "검색 키워드 (영문)", "description": "이 키워드로 검색하면 찾을 수 있는 논문 주제 설명 (한국어)" }
  ]
}
- insights: 5~8개의 핵심 연구 동향 인사이트 (모터 기술만)
- searchKeywords: 5~8개의 Google Scholar 검색 키워드`,
      `뉴스 ${newsData.length}건:\n\n${newsSummary}`
    );

    // 3. Patent Insights (no individual patents - AI cannot provide real links)
    console.log('Generating patent insights...');
    const patentsData = await callAI(
      `당신은 전기차 **모터(Motor)** 특허 분석 전문가입니다. 뉴스에서 언급된 기업과 기술을 기반으로 **모터 기술 특허 동향 인사이트**를 분석하세요.

⚠️ 반드시 모터 기술만 포함:
- ✅ 포함: IPMSM, EESM, Axial Flux, Hairpin Winding, Rotor/Stator 설계, 모터 냉각, NVH, 모터 토크/출력, 감속기, 모터 제어, 모터 재료(전기강판, 영구자석, Dy-free), 모터 제조공정, 코일 권선, 모터 효율
- ❌ 제외: 인버터, SiC/GaN 반도체, 배터리, BMS, 충전, V2G, 자율주행, ADAS, 연료전지, 수소, 전력전자, DC-DC 컨버터, OBC, 열관리시스템(모터 냉각 제외)

반드시 다음 JSON 구조로 응답:
{
  "insights": [
    { "title": "인사이트 제목", "content": "분석 내용 (5-8문장, 구체적 기업/수치/기술 포함)" }
  ],
  "searchKeywords": [
    { "keyword": "검색 키워드 (영문)", "description": "이 키워드로 검색하면 찾을 수 있는 특허 주제 설명 (한국어)" }
  ]
}
- insights: 5~8개의 핵심 특허 동향 인사이트 (모터 기술만)
- searchKeywords: 5~8개의 Google Patents 검색 키워드`,
      `뉴스 ${newsData.length}건:\n\n${newsSummary}`
    );

    // Store all data
    const storeData = async (type: string, content: any) => {
      await supabase.from('market_analysis').delete().eq('type', type);
      await supabase.from('market_analysis').insert({
        type,
        content,
        news_analyzed_count: newsData.length,
        generated_at: new Date().toISOString(),
      });
    };

    await storeData('charts', chartsData);
    await storeData('research', { insights: researchData.insights || [], searchKeywords: researchData.searchKeywords || [] });
    await storeData('patents', { insights: patentsData.insights || [], searchKeywords: patentsData.searchKeywords || [] });

    console.log(`Market data analysis completed. Research insights: ${(researchData.insights || []).length}, Patent insights: ${(patentsData.insights || []).length}`);

    return new Response(
      JSON.stringify({ success: true, newsAnalyzed: newsData.length }),
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
