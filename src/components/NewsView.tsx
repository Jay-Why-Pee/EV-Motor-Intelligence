import { useState } from "react";
import { NewsCard } from "./NewsCard";
import { Button } from "./ui/button";

type Category = "all" | "breaking" | "tech" | "market" | "korea";

const mockNews = [
  {
    id: "1",
    title: "현대차, 차세대 통합 전동화 플랫폼 'E-GMP.S' 공개",
    title_kr: "현대차, 차세대 통합 전동화 플랫폼 'E-GMP.S' 공개",
    summary: "현대자동차그룹이 PBV 전용 플랫폼 E-GMP.S를 공개했다. E-GMP의 핵심 기술을 계승하면서 비즈니스 모빌리티 고객을 위한 설계로 전동화 시장을 선도한다.",
    category: "korea" as const,
    source: "현대자동차",
    date: "2025-02-27",
    url: "https://www.hyundai.co.kr/story/CONT0000000000170259"
  },
  {
    id: "2",
    title: "테슬라, 사이버트럭 800V 전력 변환 시스템 혁신",
    title_kr: "테슬라, 사이버트럭 800V 전력 변환 시스템 혁신",
    summary: "테슬라 사이버트럭의 차세대 전력 변환 시스템이 800V 작동과 양방향 에너지 전송을 가능하게 한다. 이는 성능 향상과 가정용 전력 백업까지 지원하는 혁신적 기술이다.",
    category: "breaking" as const,
    source: "Lean Design",
    date: "2025-05-06",
    url: "https://leandesign.com/cybertruck-power-converter-breakthrough/"
  },
  {
    id: "3",
    title: "BYD-테슬라, 글로벌 전기차 시장 1위 쟁탈전 치열",
    title_kr: "BYD-테슬라, 글로벌 전기차 시장 1위 쟁탈전 치열",
    summary: "테슬라가 전기차 시장 점유율 유지에 고군분투하는 가운데, BYD는 유럽에서 7월 판매가 200% 급증하며 강력한 도전장을 내밀고 있다.",
    category: "market" as const,
    source: "Benzinga Korea",
    date: "2025-08-28",
    url: "https://kr.benzinga.com/news/usa/stocks/%ED%85%8C%EC%8A%AC%EB%9D%BC-%EC%A0%84%EA%B8%B0%EC%B0%A8-%EC%8B%9C%EC%9E%A5-%EC%A0%90%EC%9C%A0%EC%9C%A8-%EC%9C%A0%EC%A7%80%EC%97%90-%EA%B3%A0%EA%B5%B0%EB%B6%84%ED%88%ACbyd-%EC%9C%A0/"
  },
  {
    id: "4",
    title: "보쉬, PCIM 2025서 실리콘 카바이드(SiC) 기술 집중 조명",
    title_kr: "보쉬, PCIM 2025서 실리콘 카바이드(SiC) 기술 집중 조명",
    summary: "보쉬가 PCIM Europe 2025에서 실리콘 카바이드 기술을 집중 조명했다. SiC는 자동차 산업을 혁신적으로 변화시킬 핵심 기술로 주목받고 있다.",
    category: "tech" as const,
    source: "Bosch Semiconductors",
    date: "2025-05-08",
    url: "https://www.bosch-semiconductors.com/stories/bosch-at-pcim-2025/"
  },
  {
    id: "5",
    title: "LG마그나, GM 위해 멕시코에 1억 달러 EV 부품 공장 건설",
    title_kr: "LG마그나, GM 위해 멕시코에 1억 달러 EV 부품 공장 건설",
    summary: "LG전자와 마그나 인터내셔널의 합작사 LG마그나 e-파워트레인이 멕시코에 1억 달러 규모의 전기차 부품 공장을 건설한다. GM을 위한 전략적 투자다.",
    category: "korea" as const,
    source: "Korea Herald",
    date: "2022-04-20",
    url: "https://www.koreaherald.com/article/2847104"
  },
  {
    id: "6",
    title: "모터 표준 탑재 시대, 중국 리스크 회피로 리사이클링 주목",
    title_kr: "모터 표준 탑재 시대, 중국 리스크 회피로 리사이클링 주목",
    summary: "순수 내연기관 차량이 감소하며 모든 자동차에 모터가 표준 탑재되는 시대가 온다. 희토류 공급망 리스크 회피를 위해 리사이클링 기술이 주목받고 있다.",
    category: "tech" as const,
    source: "Nikkei xTECH",
    date: "2024-03-15",
    url: "https://xtech.nikkei.com/atcl/nxt/mag/at/18/00006/00715/"
  },
];

export const NewsView = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const categories = [
    { id: "all" as const, label: "전체" },
    { id: "breaking" as const, label: "속보" },
    { id: "tech" as const, label: "기술" },
    { id: "market" as const, label: "시장" },
    { id: "korea" as const, label: "국내" },
  ];

  const filteredNews = activeCategory === "all" 
    ? mockNews 
    : mockNews.filter(news => news.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? "default" : "outline"}
            onClick={() => setActiveCategory(category.id)}
            size="sm"
            className="transition-all"
          >
            {category.label}
            {activeCategory === category.id && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
                {category.id === "all" ? mockNews.length : mockNews.filter(n => n.category === category.id).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredNews.map(news => (
          <NewsCard key={news.id} {...news} />
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          해당 카테고리의 뉴스가 없습니다.
        </div>
      )}
    </div>
  );
};
