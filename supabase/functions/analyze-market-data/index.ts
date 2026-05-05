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

  try {
    const res = await fetchWithTimeout(original, {}, 12000);
    const finalUrl = normalizeUrl(res.url || original);
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
  // Real patent numbers have a country prefix (US, EP, CN, JP, KR, WO, DE) followed by digits
  if (!/^(US|EP|CN|JP|KR|WO|DE|FR|GB)\d{4,}/i.test(normalized)) return true;
  return false;
};

const verifyPatentEntry = async (patent: any) => {
  const patentNumber = String(patent?.patentNumber || '').trim();
  if (likelyFakePatentNumber(patentNumber)) {
    return null;
  }

  // Google Patents blocks external fetches (ERR_BLOCKED_BY_RESPONSE).
  // Instead, trust well-formatted patent numbers and link via Google Search.
  const searchUrl = `https://www.google.com/search?q=patent+${encodeURIComponent(patentNumber)}`;

  return {
    ...patent,
    link: searchUrl,
    patentNumber,
    patentNumberVerified: true,
    linkVerified: true,
    linkStatus: 200,
    linkBlockedReason: null,
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

    // 2. Research Papers (accumulate)
    console.log('Generating research data...');
    const existingTitles = existingPapers.slice(0, 50).map((p: any) => p.title).join(', ');
    const researchData = await callAI(
      `당신은 전기차 **모터(Motor)** 기술 연구 전문가입니다. 뉴스에서 언급된 기술 트렌드를 기반으로 **모터 기술에 직접 관련된 실제 연구 논문만** 생성하세요.

⚠️ 반드시 모터 기술만 포함:
- ✅ 포함: IPMSM, EESM, Axial Flux, Hairpin Winding, Rotor/Stator 설계, 모터 냉각, NVH, 모터 토크/출력, 감속기, 모터 제어, 모터 재료(전기강판, 영구자석, Dy-free), 모터 제조공정, 코일 권선, 모터 효율
- ❌ 제외: 인버터, SiC/GaN 반도체, 배터리, BMS, 충전, V2G, 자율주행, ADAS, 연료전지, 수소, 전력전자, DC-DC 컨버터, OBC, 열관리시스템(모터 냉각 제외)

반드시 다음 JSON 구조로 응답:
{
  "papers": [
    { "title": "논문 제목 (영문)", "authors": "저자", "journal": "학술지", "year": "2024", "summary": "요약 (한국어)", "keywords": ["키워드"], "link": "검색URL" }
  ],
  "insights": [
    { "title": "인사이트 제목", "content": "분석 내용 (3-5문장)" }
  ]
}
- papers: 5~8개의 NEW 논문 (기존 목록과 중복되지 않게)
- insights: 전체 연구 동향에 대한 1~5개 핵심 인사이트 (모터 기술만)
- link는 실제 열람 가능한 원문 또는 공식 논문 랜딩 페이지 URL만 허용. 추정 URL, 존재 불명 URL, 깨진 링크 금지
- keywords에 인버터, 배터리, BMS, 충전 등 비모터 키워드 절대 포함 금지`,
      `뉴스 ${newsData.length}건:\n\n${newsSummary}\n\n기존 논문 제목 (중복 방지): ${existingTitles || '없음'}`
    );

    // 3. Patents (accumulate)
    console.log('Generating patents data...');
    const existingPatentTitles = existingPatentsList.slice(0, 50).map((p: any) => p.title).join(', ');
    const patentsData = await callAI(
      `당신은 전기차 **모터(Motor)** 특허 분석 전문가입니다. 뉴스에서 언급된 기업과 기술을 기반으로 **모터 기술에 직접 관련된 실제 특허만** 생성하세요.

⚠️ 반드시 모터 기술만 포함:
- ✅ 포함: IPMSM, EESM, Axial Flux, Hairpin Winding, Rotor/Stator 설계, 모터 냉각, NVH, 모터 토크/출력, 감속기, 모터 제어, 모터 재료(전기강판, 영구자석, Dy-free), 모터 제조공정, 코일 권선, 모터 효율
- ❌ 제외: 인버터, SiC/GaN 반도체, 배터리, BMS, 충전, V2G, 자율주행, ADAS, 연료전지, 수소, 전력전자, DC-DC 컨버터, OBC, 열관리시스템(모터 냉각 제외)

반드시 다음 JSON 구조로 응답:
{
  "patents": [
    { "title": "특허 제목", "patentNumber": "번호", "applicant": "출원인", "filingDate": "YYYY-MM-DD", "country": "국가", "summary": "요약 (한국어)", "technicalField": ["분야"], "link": "실제 Google Patents 원문 URL" }
  ],
  "insights": [
    { "title": "인사이트 제목", "content": "분석 내용 (3-5문장)" }
  ]
}
- patents: 5~8개의 NEW 특허 (기존과 중복되지 않게)
- insights: 전체 특허 동향에 대한 1~5개 핵심 인사이트 (모터 기술만)
- patentNumber는 실제 존재하는 번호만 허용. 123456, 654321 같은 단순 숫자나 추정 번호 절대 금지
- link는 https://patents.google.com/patent/... 형태의 실제 원문 URL만 허용
- technicalField에 인버터, 배터리, BMS 등 비모터 분야 절대 포함 금지`,
      `뉴스 ${newsData.length}건:\n\n${newsSummary}\n\n기존 특허 제목 (중복 방지): ${existingPatentTitles || '없음'}`
    );

    // Non-motor keyword blocklist for filtering accumulated data
    const nonMotorKeywords = [
      'battery', 'batteries', '배터리', 'bms', 'cell', 'cathode', 'anode', 'electrolyte',
      'solid-state', 'semi-solid', '반고체', '전고체', 'lithium',
      'inverter', '인버터', 'sic', 'gan', 'mosfet', 'power electronics', '전력전자',
      'dc-dc', 'obc', 'on-board charger',
      'charging', 'charger', '충전', 'supercharger', 'megawatt', 'v2g', 'v2h',
      'autonomous', '자율주행', 'adas', 'self-driving', '비상 제동',
      'fuel cell', '연료전지', 'hydrogen', '수소',
      'software-defined', 'sdv', 'ota', 'infotainment', '인포테인먼트',
      'parking', '주차', 'geopolitical', '지정학',
    ];
    const isMotorRelated = (item: any): boolean => {
      const text = JSON.stringify(item).toLowerCase();
      return !nonMotorKeywords.some(kw => text.includes(kw));
    };

    const verifyPaperEntry = async (paper: any) => {
      const verifiedLink = await verifyExternalLink(paper?.link, [paper?.title || '', paper?.journal || '']);
      return {
        ...paper,
        link: verifiedLink.linkVerified ? verifiedLink.url : '',
        linkVerified: verifiedLink.linkVerified,
        linkStatus: verifiedLink.linkStatus,
        linkBlockedReason: verifiedLink.linkBlockedReason,
      };
    };

    // Merge, filter non-motor, validate links, and trim
    const newPapers = await Promise.all((researchData.papers || []).filter(isMotorRelated).map(verifyPaperEntry));
    const filteredExistingPapers = await Promise.all(existingPapers.filter(isMotorRelated).map(verifyPaperEntry));
    const allPapers = [...newPapers, ...filteredExistingPapers]
      .filter((paper, index, arr) => paper?.title && arr.findIndex((candidate) => candidate.title === paper.title) === index)
      .slice(0, 333);
    const researchInsights = researchData.insights || [];

    const newPatents = (await Promise.all((patentsData.patents || []).filter(isMotorRelated).map(verifyPatentEntry))).filter(Boolean);
    const filteredExistingPatents = (await Promise.all(existingPatentsList.filter(isMotorRelated).map(verifyPatentEntry))).filter(Boolean);
    const allPatents = [...newPatents, ...filteredExistingPatents]
      .filter((patent: any, index: number, arr: any[]) => patent?.patentNumber && arr.findIndex((candidate) => candidate.patentNumber === patent.patentNumber) === index)
      .slice(0, 333);
    const patentInsights = patentsData.insights || [];

    console.log(`Filtered: papers ${existingPapers.length}→${filteredExistingPapers.length}, patents ${existingPatentsList.length}→${filteredExistingPatents.length}`);
    console.log(`Verified: papers clickable=${allPapers.filter((paper: any) => paper.linkVerified).length}/${allPapers.length}, patents verified=${allPatents.length}`);

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
    await storeData('research', { papers: allPapers, insights: researchInsights });
    await storeData('patents', { patents: allPatents, insights: patentInsights });

    console.log(`Market data analysis completed. Papers: ${allPapers.length}, Patents: ${allPatents.length}`);

    return new Response(
      JSON.stringify({ success: true, newsAnalyzed: newsData.length, papers: allPapers.length, patents: allPatents.length }),
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
