import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { BookOpen, Calendar, Users } from "lucide-react";

const Research = () => {
  // Placeholder data - will be replaced with actual research paper data
  const papers = [
    {
      id: 1,
      title: "Design and Optimization of Permanent Magnet Motors for Electric Vehicles",
      authors: "Wang, Y., Li, X., Zhang, H.",
      journal: "IEEE Transactions on Energy Conversion",
      year: "2023",
      summary: "전기자동차용 영구자석 모터의 토크 밀도와 효율을 극대화하기 위한 최적화 설계 기법을 제안합니다.",
      keywords: ["영구자석 모터", "전기차", "최적화", "토크 밀도"],
      link: "https://ieeexplore.ieee.org/document/10123456",
    },
    {
      id: 2,
      title: "Thermal Analysis and Cooling System Design for High-Power EV Motors",
      authors: "Chen, L., Park, S., Kim, M.",
      journal: "International Journal of Heat and Mass Transfer",
      year: "2023",
      summary: "고출력 전기차 모터의 열 분석 및 효율적인 냉각 시스템 설계 방법론을 제시합니다.",
      keywords: ["열 관리", "냉각 시스템", "고출력 모터", "전기차"],
      link: "https://www.sciencedirect.com/science/article/pii/S0017931023000000",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="research" onViewChange={() => {}} />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">
            논문 분석
          </h1>
          <p className="text-muted-foreground">
            EV 모터 기술 관련 최신 논문 분석 및 동향
          </p>
        </div>

        <div className="grid gap-6">
          {papers.map((paper) => (
            <a 
              key={paper.id} 
              href={paper.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block transition-transform hover:scale-[1.01]"
            >
              <Card className="p-6 card-glow cursor-pointer">
                <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{paper.title}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{paper.authors}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>{paper.journal}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{paper.year}</span>
                    </div>
                  </div>
                </div>

                <p className="text-foreground">{paper.summary}</p>

                <div className="flex flex-wrap gap-2">
                  {paper.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              </Card>
            </a>
          ))}
        </div>
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 EV Market Intelligence Dashboard. All rights reserved.</p>
          <p className="mt-2">실시간 데이터 기반 전기차 모터 시장 분석 플랫폼</p>
        </div>
      </footer>
    </div>
  );
};

export default Research;
