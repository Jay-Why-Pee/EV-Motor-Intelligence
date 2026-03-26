import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { TrendingUp, BarChart3, Newspaper, BookOpen, FileText, MessageSquarePlus, History, type LucideIcon } from "lucide-react";

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
    description: "뉴스·논문·특허 데이터를 기반으로 AI가 생성한 기술 키워드 워드 클라우드, 글로벌 BEV/HEV/PHEV 모터 스펙 데이터베이스(출시연도·OEM·필터 지원), PRM/TRM 로드맵 타임라인을 제공합니다.",
    howToUse: "'데이터 분석 시작' 버튼으로 최신 데이터를 분석하세요. 모터 스펙 DB는 출시년도·OEM·속도별 필터로 원하는 차종을 빠르게 찾을 수 있습니다.",
    tips: ["격일 오전 6시(KST)에 자동 업데이트됩니다", "모터 스펙 DB는 듀얼 모터 차량의 경우 슬래시(/)로 구분 표기됩니다"],
  },
  {
    icon: Newspaper,
    title: "뉴스",
    description: "EV 모터 관련 뉴스를 지역별, OEM별, 부품사별 카테고리로 분류하여 제공합니다. 페이지 최상단에는 최근 뉴스 300건 기반의 AI 종합 분석(News Pulse)이 표시됩니다.",
    howToUse: "카테고리 버튼으로 필터링 → 'AI 분석' 버튼으로 해당 카테고리의 종합 분석 확인 → 개별 뉴스 카드 클릭으로 원본 기사 열람",
    tips: ["'뉴스 크롤링' 버튼으로 최신 뉴스를 즉시 수집할 수 있습니다", "News Pulse는 뉴스 크롤링 시 자동으로 업데이트됩니다"],
  },
  {
    icon: BookOpen,
    title: "논문",
    description: "EV 모터 기술 관련 최신 연구 논문 동향을 AI가 분석하여 제공합니다. 격일 업데이트되며 최대 333개까지 누적됩니다. 상단에 AI 종합 분석이 표시됩니다.",
    howToUse: "논문 카드를 클릭하면 관련 학술 검색 페이지로 이동합니다. 키워드 태그로 기술 트렌드를 파악하세요.",
  },
  {
    icon: FileText,
    title: "특허",
    description: "주요 기업들의 EV 모터 관련 특허 출원 동향을 분석합니다. 격일 업데이트되며 최대 333개까지 누적됩니다.",
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

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">사용 가이드</h1>
          <p className="text-muted-foreground">EV Motor Lens의 각 페이지 기능과 사용법을 확인하세요</p>
        </div>

        <div className="space-y-4">
          {pages.map((page, idx) => (
            <Card key={idx} className="p-5 card-glow hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                  <span className="text-sm font-bold text-primary">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <page.icon className="w-4 h-4 text-primary shrink-0" />
                    <h2 className="text-lg font-semibold">{page.title}</h2>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">{page.description}</p>
                  <div className="bg-muted/40 rounded-md px-4 py-3">
                    <p className="text-sm text-foreground/80">
                      <span className="font-medium text-primary">💡 사용법 </span>
                      {page.howToUse}
                    </p>
                  </div>
                  {page.tips && (
                    <ul className="mt-2.5 space-y-1">
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
