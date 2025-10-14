import { useState } from "react";
import { NewsCard } from "./NewsCard";
import { Button } from "./ui/button";

type Category = "all" | "breaking" | "tech" | "market" | "korea";

const mockNews = [
  {
    id: "1",
    title: "현대차, 차세대 통합 전동화 플랫폼 'eM' 공개",
    title_kr: "현대차, 차세대 통합 전동화 플랫폼 'eM' 공개",
    summary: "현대자동차가 2025년형 아이오닉 시리즈에 적용될 차세대 전동화 플랫폼을 공개했다. 새로운 통합 모터 시스템은 기존 대비 30% 향상된 효율을 제공한다.",
    category: "korea" as const,
    source: "조선일보",
    date: "2025-10-14",
    url: "#"
  },
  {
    id: "2",
    title: "테슬라, 800V 고전압 모터 시스템 양산 돌입",
    title_kr: "테슬라, 800V 고전압 모터 시스템 양산 돌입",
    summary: "테슬라가 차세대 전기차에 탑재될 800V 고전압 모터 시스템의 대량 생산을 시작했다. 이는 충전 시간을 획기적으로 단축시킬 것으로 예상된다.",
    category: "breaking" as const,
    source: "Reuters",
    date: "2025-10-13",
    url: "#"
  },
  {
    id: "3",
    title: "중국 BYD, 글로벌 EV 모터 시장 점유율 1위 달성",
    title_kr: "중국 BYD, 글로벌 EV 모터 시장 점유율 1위 달성",
    summary: "중국의 전기차 제조업체 BYD가 2024년 3분기 기준 글로벌 EV 모터 시장에서 18.5%의 점유율로 1위를 차지했다. 이는 전년 대비 4.2%p 증가한 수치다.",
    category: "market" as const,
    source: "Bloomberg",
    date: "2025-10-12",
    url: "#"
  },
  {
    id: "4",
    title: "실리콘 카바이드 기반 차세대 모터 컨트롤러 개발",
    title_kr: "실리콘 카바이드 기반 차세대 모터 컨트롤러 개발",
    summary: "독일 보쉬가 실리콘 카바이드(SiC) 반도체를 활용한 차세대 모터 컨트롤러를 개발했다. 에너지 효율이 15% 향상되고 발열은 40% 감소했다.",
    category: "tech" as const,
    source: "Automotive News",
    date: "2025-10-11",
    url: "#"
  },
  {
    id: "5",
    title: "LG마그나, 북미 EV 모터 공장 증설 계획 발표",
    title_kr: "LG마그나, 북미 EV 모터 공장 증설 계획 발표",
    summary: "LG마그나 e-파워트레인이 미국 미시간주에 연간 50만대 규모의 EV 모터 생산 시설을 신설한다고 발표했다. 총 투자 금액은 12억 달러에 달한다.",
    category: "korea" as const,
    source: "한국경제",
    date: "2025-10-10",
    url: "#"
  },
  {
    id: "6",
    title: "희토류 없는 친환경 모터 기술 상용화 임박",
    title_kr: "희토류 없는 친환경 모터 기술 상용화 임박",
    summary: "일본 니혼덴산이 희토류를 사용하지 않는 전기차 모터를 개발했다. 이는 공급망 리스크를 줄이고 원가를 20% 절감할 수 있을 것으로 예상된다.",
    category: "tech" as const,
    source: "Nikkei Asia",
    date: "2025-10-09",
    url: "#"
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
