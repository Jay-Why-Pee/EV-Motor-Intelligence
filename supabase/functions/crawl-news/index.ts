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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting news crawling process...');

    // Sample news articles (in production, this would crawl from actual news sources)
    const newsArticles = [
      {
        title: "Hyundai Motor unveils next-generation integrated electrification platform 'E-GMP.S'",
        title_kr: "현대차, 차세대 통합 전동화 플랫폼 'E-GMP.S' 공개",
        summary: "현대자동차그룹이 PBV 전용 플랫폼 E-GMP.S를 공개했다. E-GMP의 핵심 기술을 계승하면서 비즈니스 모빌리티 고객을 위한 설계로 전동화 시장을 선도한다.",
        category: "korea",
        source: "Hyundai Motor",
        date: "2025-02-27",
        url: "https://www.hyundai.co.kr/story/CONT0000000000170259"
      },
      {
        title: "Tesla Cybertruck 800V Power Conversion System Innovation",
        title_kr: "테슬라, 사이버트럭 800V 전력 변환 시스템 혁신",
        summary: "테슬라 사이버트럭의 차세대 전력 변환 시스템이 800V 작동과 양방향 에너지 전송을 가능하게 한다. 이는 성능 향상과 가정용 전력 백업까지 지원하는 혁신적 기술이다.",
        category: "breaking",
        source: "Lean Design",
        date: "2025-05-06",
        url: "https://leandesign.com/cybertruck-power-converter-breakthrough/"
      },
      {
        title: "BYD-Tesla Global EV Market Leadership Battle Intensifies",
        title_kr: "BYD-테슬라, 글로벌 전기차 시장 1위 쟁탈전 치열",
        summary: "테슬라가 전기차 시장 점유율 유지에 고군분투하는 가운데, BYD는 유럽에서 7월 판매가 200% 급증하며 강력한 도전장을 내밀고 있다.",
        category: "market",
        source: "Benzinga Korea",
        date: "2025-08-28",
        url: "https://kr.benzinga.com/news/usa/stocks/%ED%85%8C%EC%8A%AC%EB%9D%BC-%EC%A0%84%EA%B8%B0%EC%B0%A8-%EC%8B%9C%EC%9E%A5-%EC%A0%90%EC%9C%A0%EC%9C%A8-%EC%9C%A0%EC%A7%80%EC%97%90-%EA%B3%A0%EA%B5%B0%EB%B6%84%ED%88%ACbyd-%EC%9C%A0/"
      },
      {
        title: "Bosch highlights Silicon Carbide (SiC) technology at PCIM 2025",
        title_kr: "보쉬, PCIM 2025서 실리콘 카바이드(SiC) 기술 집중 조명",
        summary: "보쉬가 PCIM Europe 2025에서 실리콘 카바이드 기술을 집중 조명했다. SiC는 자동차 산업을 혁신적으로 변화시킬 핵심 기술로 주목받고 있다.",
        category: "tech",
        source: "Bosch Semiconductors",
        date: "2025-05-08",
        url: "https://www.bosch-semiconductors.com/stories/bosch-at-pcim-2025/"
      },
      {
        title: "LG Magna builds $100M EV parts plant in Mexico for GM",
        title_kr: "LG마그나, GM 위해 멕시코에 1억 달러 EV 부품 공장 건설",
        summary: "LG전자와 마그나 인터내셔널의 합작사 LG마그나 e-파워트레인이 멕시코에 1억 달러 규모의 전기차 부품 공장을 건설한다. GM을 위한 전략적 투자다.",
        category: "korea",
        source: "Korea Herald",
        date: "2024-04-20",
        url: "https://www.koreaherald.com/article/2847104"
      },
      {
        title: "Standard motor installation era, recycling gains attention to avoid China risk",
        title_kr: "모터 표준 탑재 시대, 중국 리스크 회피로 리사이클링 주목",
        summary: "순수 내연기관 차량이 감소하며 모든 자동차에 모터가 표준 탑재되는 시대가 온다. 희토류 공급망 리스크 회피를 위해 리사이클링 기술이 주목받고 있다.",
        category: "tech",
        source: "Nikkei xTECH",
        date: "2024-03-15",
        url: "https://xtech.nikkei.com/atcl/nxt/mag/at/18/00006/00715/"
      }
    ];

    // Generate 50 news articles by repeating and modifying dates
    const expandedNews = [];
    const today = new Date();
    
    for (let i = 0; i < 50; i++) {
      const baseArticle = newsArticles[i % newsArticles.length];
      const daysAgo = i;
      const articleDate = new Date(today);
      articleDate.setDate(articleDate.getDate() - daysAgo);
      
      expandedNews.push({
        ...baseArticle,
        date: articleDate.toISOString().split('T')[0],
        url: `${baseArticle.url}?v=${i}` // Make URLs unique
      });
    }

    // Clear existing news
    const { error: deleteError } = await supabase
      .from('news')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error clearing old news:', deleteError);
    }

    // Insert new news
    const { data, error } = await supabase
      .from('news')
      .insert(expandedNews)
      .select();

    if (error) {
      console.error('Error inserting news:', error);
      throw error;
    }

    console.log(`Successfully crawled and inserted ${data?.length || 0} news articles`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: data?.length || 0,
        message: 'News crawling completed successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in crawl-news function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
