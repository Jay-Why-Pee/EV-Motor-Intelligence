import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";

interface ChangelogEntry {
  date: string;
  title: string;
  changes: string[];
  prompts: string[];
}

const changelog: ChangelogEntry[] = [
  {
    date: "2026.03.26",
    title: "Motor Spec DB 고도화 & 가이드 개선",
    changes: [
      "Motor Spec DB: 듀얼 모터 차량 토크/출력을 슬래시(/)로 구분 표기 (예: 300/200)",
      "Motor Spec DB: 헤더에만 단위 표시, 데이터 행은 숫자만 표기",
      "Motor Spec DB: 출시년도·OEM·최대속도별 필터 기능 추가",
      "Motor Spec DB: 차종 수 100개 이상으로 확대 (AI 프롬프트 강화)",
      "가이드 페이지 내용 현행화 및 디자인 개선 (번호 표기, 레이아웃 정리)",
      "변경이력 페이지 업데이트",
    ],
    prompts: [
      "토크, 출력의 경우 듀얼 모터는 슬래시로 구분해서 써줘",
      "토크,출력,최대속도 헤더에 단위를 써줬으니 행에서는 숫자만 써줘",
      "출시년도별, OEM별, 속도별로 필터링 기능 추가해줘",
      "차종 40개보다 더 있으면 찾아서 추가해줘",
      "변경이력과 가이드 내용 업데이트해줘",
    ],
  },
  {
    date: "2026.03.26",
    title: "차트 페이지 전면 개편 & UX 개선",
    changes: [
      "차트 페이지 전면 개편: 워드 클라우드, 모터 스펙 테이블, PRM/TRM 로드맵 타임라인으로 재구성",
      "인사이트 페이지 삭제 → 뉴스 페이지 최상단 'News Pulse'로 이전",
      "AI 분석 프롬프트를 모터 R&D 기술 중심으로 전면 개선",
      "방문자 카운터(Visits) 추가",
      "트렌드 브리핑 카드 최대 3개 제한",
      "이탈 방지 다이얼로그 추가 (피드백 유도)",
      "차트/News Pulse 수동 새로고침 버튼 제거 → 뉴스 크롤링 시 자동 분석 연동",
    ],
    prompts: [
      "차트 페이지는 실질적으로 모터 R&D 엔지니어에게 도움이 되는 정보로 전면 개편해줘",
      "인사이트 페이지는 삭제하고 뉴스 페이지 최상단에 News Pulse로 옮겨줘",
      "방문 횟수를 누적 숫자로 표기해줘",
      "트렌드 브리핑 카드는 최대 3개까지만 만들어지도록 해줘",
      "웹페이지 닫기 버튼을 클릭하면 피드백 유도 메세지가 나오게 해줘",
      "차트 데이터는 뉴스 데이터 업데이트와 함께 자동으로 분석결과 업데이트되도록 해줘",
    ],
  },
  {
    date: "2026.03.23",
    title: "DIY 기능 정리 & 크론 주기 변경",
    changes: [
      "뉴스 DIY, 인사이트 DIY 페이지 및 기능 삭제",
      "뉴스카드 AI 요약 다이얼로그 제거 → 클릭 시 원본기사 직접 연결로 복귀",
      "자동 크롤링/분석 주기를 매일 → 격일(2일에 한번)로 변경",
      "헤더 업데이트 문구 'Updated every other day, 6 AM (KST)'로 변경",
      "변경이력 페이지를 프로젝트 초기부터의 전체 기록으로 재작성",
      "가이드 페이지에서 삭제된 DIY 항목 제거 및 내용 갱신",
    ],
    prompts: [
      "뉴스 DIY, 인사이트 DIY 페이지와 기능은 삭제해줘",
      "뉴스카드별 AI 요약 기능도 삭제하고 다시 클릭하면 원본기사로 연결되도록 원상복귀해줘",
      "변경이력 페이지의 내용은 2025년에 처음 이 사이트를 만들기 시작했을 시점부터 기록해줘",
      "지금 매일 자동으로 실행되고 있는 기능들은 2일에 한번씩 실행되도록 변경해줘",
    ],
  },
  {
    date: "2026.03.23",
    title: "종합 업데이트 & 리브랜딩",
    changes: [
      "사이트명 'EV Motor Lens / EV Motor Landscape'로 리브랜딩",
      "초기 비밀번호 변경",
      "뉴스 페이지: 카드 클릭 시 AI 요약 다이얼로그 표시 (원본 링크 하단 제공)",
      "뉴스 카테고리별 AI 종합 분석 기능 추가",
      "논문/특허 누적 시스템 (최대 333개, FIFO)",
      "논문/특허 AI 종합 분석 인사이트 표시",
      "사용 가이드 페이지 추가",
      "변경 이력 페이지 추가",
      "피드백 관리자 삭제 기능 추가",
      "AI 비용 구조 정리",
    ],
    prompts: [
      "뉴스 페이지의 뉴스들도 클릭했을 때 원본기사로 연결하지말고, 트렌드 브리핑의 카드 뉴스들처럼 클릭하면 AI 요약내용을 한글로 정리해서 보여주고나서 아래쪽에 원본기사 링크를 모아서 정리해줘",
      "뉴스 내용들은 카테고리별로 해당 카테고리에 포함된 뉴스 기사들의 내용을 종합적으로 AI 분석한 내용을 1~5개 정도로 별도로 최상단에 표기해줘",
      "논문도 특허도 매일 크롤링해서 기존 내역들과 신규로 추가된 내용들이 333개까지 누적되도록 해주고",
      "맨 앞에 한 페이지를 추가해서, 각 페이지들이 어떤 역할과 기능을 하는지를 간략하게 설명하는 내용들로 구성해줘",
      "맨 뒤에 한 페이지를 추가해서, History를 나열해줘",
      "피드백 페이지에서 관리자 비밀번호를 입력하면 지우고 싶은 피드백들을 선택해서 지울 수 있도록 해줘",
    ],
  },
  {
    date: "2026.03.19",
    title: "차트 페이지 전면 개편",
    changes: [
      "기존 시장 규모 중심 KPI → 시그널 기반 KPI로 전환",
      "뉴스/논문/특허 기반 탭 차트 구조로 재구성",
      "기술 키워드 트렌드, OEM 히트맵, 정책 트렌드 차트 추가",
      "연구 주제별 성장 곡선, 국가별 연구 집중도 차트 추가",
      "특허 출원량 트렌드, 상승 기술 TOP 10, 특허 영향력 랭킹 추가",
      "트렌드 브리핑을 홈페이지(/)로 이동",
    ],
    prompts: [
      "차트 페이지는 구성의 개선이 필요한 것 같아. 실질적으로 전기자동차 모터를 개발하고 수주대응 업무를 하는 사람들에게 도움이 되는 정보가 아닌 것 같다고 생각해",
      "트렌드 브리핑 페이지를 첫 페이지로 옮겨줘",
    ],
  },
  {
    date: "2026.03.16",
    title: "보안 & 브랜딩 강화",
    changes: [
      "비밀번호 게이트 페이지 추가 (사이트 접근 제어)",
      "비밀번호 변경 기능 (마스터 비밀번호 기반)",
      "사이트 전체 Footer 추가 (LLM 모델 명시)",
      "피드백 AI 종합 분석 기능 추가",
      "피드백 FIFO 777개 제한 시스템",
    ],
    prompts: [
      "Site에 접속하면 비밀번호를 입력하는 화면이 심플하고 고급스럽게 나오게 해줘",
      "비밀번호를 입력한 후에 '버튼'을 누르면 현재까지 구성된 사이트 내용들을 전부 확인가능하도록 공개되도록 해줘",
      "피드백들도 종합적으로 분석해서, 어떤 수요들이 있는지 요약해서 피드백 페이지에 정리해줘",
    ],
  },
  {
    date: "2026.03.12",
    title: "트렌드 브리핑 & 피드백 페이지",
    changes: [
      "트렌드 브리핑 페이지 추가 (주제별 AI 트렌드 분석)",
      "브리핑 히스토리 자동 저장 (최대 10건)",
      "피드백 페이지 추가 (크리에이티브 그라데이션 디자인)",
      "만족도 선택, 카테고리 분류 기능",
    ],
    prompts: [
      "입력된 주제별로 뉴스를 검색 후 내용을 요약하여 카드 형태로 화면에 보이게 하고 클릭하면 상세 분석 내용이 보이도록 해줘",
      "특허 페이지 옆쪽에 사용자들이 Feedback을 적을 수 있는 Feedback 페이지를 만들어줘. Creative한 디자인으로 구성해줬으면 좋겠어",
    ],
  },
  {
    date: "2026.03.09",
    title: "DIY 기능 & 자동화",
    changes: [
      "뉴스 DIY 검색 기능 추가 (AI 기반 관련도 랭킹)",
      "인사이트 DIY 기능 추가",
      "논문 분석 페이지 추가",
      "특허 분석 페이지 추가",
      "매일 오전 6시(KST) 자동 크롤링/분석 크론 설정",
    ],
    prompts: [
      "사용자가 직접 주제를 입력해서 관련 뉴스를 검색할 수 있는 기능을 추가해줘",
      "논문과 특허 관련 페이지도 추가해줘",
    ],
  },
  {
    date: "2025.12.01",
    title: "프로젝트 초기 구축",
    changes: [
      "EV 모터 시장 분석 대시보드 초기 구축",
      "차트/KPI 대시보드 (시장 규모, 성장률, 지역별 점유율)",
      "뉴스 수집 기능 (자동 크롤링 시스템)",
      "뉴스 카테고리 필터링 (지역, OEM, 부품사)",
      "인사이트 자동 생성 기능",
    ],
    prompts: [
      "EV 모터 시장을 분석하는 인텔리전스 대시보드를 만들어줘. 뉴스 수집, 차트, 인사이트 기능이 필요해",
    ],
  },
];

const Changelog = () => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="changelog" />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">변경 이력</h1>
          <p className="text-muted-foreground">기능 추가 및 개선 히스토리</p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {changelog.map((entry, idx) => {
              const isExpanded = expandedIdx === idx;
              return (
                <div key={idx} className="relative pl-12">
                  {/* Timeline dot */}
                  <div className="absolute left-[12px] top-2 w-4 h-4 rounded-full bg-primary border-4 border-background" />

                  <Card className="p-5 card-glow">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    >
                      <Badge variant="outline" className="shrink-0">
                        <Calendar className="w-3 h-3 mr-1" />
                        {entry.date}
                      </Badge>
                      <h2 className="font-semibold flex-1">{entry.title}</h2>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    {/* Changes list (always visible) */}
                    <ul className="mt-3 space-y-1.5">
                      {entry.changes.map((change, ci) => (
                        <li key={ci} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          {change}
                        </li>
                      ))}
                    </ul>

                    {/* Prompts (expandable) */}
                    {isExpanded && entry.prompts.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">📝 요청 프롬프트</h3>
                        <div className="space-y-2">
                          {entry.prompts.map((prompt, pi) => (
                            <div key={pi} className="p-3 bg-muted/30 rounded-lg text-sm text-foreground/80 leading-relaxed">
                              "{prompt}"
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Changelog;
