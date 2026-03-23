import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { TrendingUp, BarChart3, Newspaper, Search, Lightbulb, Sparkles, BookOpen, FileText, MessageSquarePlus, History, type LucideIcon } from "lucide-react";

interface PageInfo {
  icon: LucideIcon;
  title: string;
  description: string;
  howToUse: string;
  tips?: string[];
}

const pages: PageInfo[] = [
  {
    icon: TrendingUp,
    title: "트렌드 브리핑",
    description: "관심 주제를 입력하면 AI가 수집된 뉴스와 내부 지식을 결합하여 심층 분석 카드를 생성합니다. 생성된 브리핑은 자동 저장되어 모든 사용자가 열람할 수 있습니다.",
    howToUse: "검색창에 관심 주제(예: '800V 플랫폼 트렌드', 'SiC 모터 기술 동향')를 입력하고 '분석' 버튼을 클릭하세요. 카드를 클릭하면 상세 분석과 출처를 확인할 수 있습니다.",
    tips: ["최근 10개의 브리핑이 하단에 누적 표시됩니다", "다른 사용자가 생성한 브리핑도 함께 볼 수 있습니다"],
  },
  {
    icon: BarChart3,
    title: "차트",
    description: "뉴스·논문·특허 데이터를 기반으로 AI가 생성한 시그널 차트를 제공합니다. 기술 키워드 트렌드, OEM 히트맵, 정책 동향, 연구 주제 분석, 특허 출원량 등을 시각화합니다.",
    howToUse: "'데이터 분석 시작' 버튼으로 최신 데이터를 분석하거나, 이미 생성된 차트를 뉴스/논문/특허 탭별로 확인하세요.",
    tips: ["매일 오전 6시(KST)에 자동 업데이트됩니다"],
  },
  {
    icon: Newspaper,
    title: "뉴스",
    description: "EV 모터 관련 뉴스를 지역별, OEM별, 부품사별 카테고리로 분류하여 제공합니다. 카드를 클릭하면 AI 요약 내용과 원본 기사 링크를 확인할 수 있습니다.",
    howToUse: "카테고리 버튼으로 필터링 → 'AI 분석' 버튼으로 해당 카테고리의 종합 분석 확인 → 개별 뉴스 카드 클릭으로 상세 내용 확인",
    tips: ["'뉴스 크롤링' 버튼으로 최신 뉴스를 즉시 수집할 수 있습니다"],
  },
  {
    icon: Search,
    title: "뉴스 DIY",
    description: "특정 주제에 관련된 뉴스를 직접 검색할 수 있습니다. AI가 수집된 뉴스 중 검색 의도에 가장 부합하는 상위 기사를 추출합니다.",
    howToUse: "검색창에 관심 키워드를 입력하고 검색하세요.",
  },
  {
    icon: Lightbulb,
    title: "인사이트",
    description: "수집된 뉴스를 AI가 종합 분석하여 생성한 전략적 인사이트를 제공합니다. 시장 동향, 기술 트렌드, 경쟁 구도 등의 핵심 정보가 정리됩니다.",
    howToUse: "페이지를 열면 최신 인사이트가 자동으로 표시됩니다.",
  },
  {
    icon: Sparkles,
    title: "인사이트 DIY",
    description: "원하는 주제에 대해 AI가 맞춤형 인사이트를 생성해드립니다.",
    howToUse: "분석 주제를 입력하고 '생성' 버튼을 클릭하세요.",
  },
  {
    icon: BookOpen,
    title: "논문",
    description: "EV 모터 기술 관련 최신 연구 논문 동향을 AI가 분석하여 제공합니다. 매일 업데이트되며 최대 333개까지 누적됩니다. 상단에 AI 종합 분석이 표시됩니다.",
    howToUse: "논문 카드를 클릭하면 관련 학술 검색 페이지로 이동합니다. 키워드 태그로 기술 트렌드를 파악하세요.",
  },
  {
    icon: FileText,
    title: "특허",
    description: "주요 기업들의 EV 모터 관련 특허 출원 동향을 분석합니다. 매일 업데이트되며 최대 333개까지 누적됩니다.",
    howToUse: "특허 카드를 클릭하면 Google Patents 검색 페이지로 이동합니다.",
  },
  {
    icon: MessageSquarePlus,
    title: "피드백",
    description: "서비스에 대한 의견, 개선 요청, 버그 리포트를 남길 수 있습니다. AI가 피드백을 종합 분석하여 주요 수요와 개선 요청을 요약합니다.",
    howToUse: "만족도 선택 → 카테고리 선택 → 메시지 작성 → 전송",
    tips: ["관리자는 마스터 비밀번호로 피드백을 관리할 수 있습니다"],
  },
  {
    icon: History,
    title: "변경이력",
    description: "이 사이트에 추가된 기능들의 히스토리를 날짜별로 확인할 수 있습니다.",
    howToUse: "날짜별 항목을 클릭하면 해당 기능 추가를 요청한 상세 내용을 확인할 수 있습니다.",
  },
];

const Guide = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="guide" />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">사용 가이드</h1>
          <p className="text-muted-foreground">EV Motor Lens의 각 페이지 기능과 사용법을 확인하세요</p>
        </div>

        <div className="space-y-5">
          {pages.map((page, idx) => (
            <Card key={idx} className="p-6 card-glow">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                  <page.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  <h2 className="text-xl font-semibold">{page.title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">{page.description}</p>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-1.5">💡 사용 방법</h3>
                    <p className="text-sm text-muted-foreground">{page.howToUse}</p>
                  </div>
                  {page.tips && (
                    <ul className="space-y-1">
                      {page.tips.map((tip, ti) => (
                        <li key={ti} className="text-xs text-muted-foreground/80 flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Guide;
