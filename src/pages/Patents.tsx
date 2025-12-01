import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { FileText, Building, Calendar, Globe } from "lucide-react";

const Patents = () => {
  // Placeholder data - will be replaced with actual patent data
  const patents = [
    {
      id: 1,
      title: "고효율 영구자석 모터 구조",
      patentNumber: "KR-10-2024-0001234",
      applicant: "현대자동차",
      filingDate: "2024-01-15",
      country: "대한민국",
      summary: "전기자동차용 영구자석 모터의 효율을 향상시키기 위한 새로운 구조를 제안합니다.",
      technicalField: ["영구자석 모터", "전기차", "고효율 설계"],
      link: "https://patents.google.com/patent/KR102024001234",
    },
    {
      id: 2,
      title: "Integrated Motor Cooling System",
      patentNumber: "US-2024-0123456",
      applicant: "Tesla Motors",
      filingDate: "2024-02-20",
      country: "United States",
      summary: "통합형 모터 냉각 시스템으로 열 관리 효율을 극대화하는 기술입니다.",
      technicalField: ["냉각 시스템", "열 관리", "전력 밀도"],
      link: "https://patents.google.com/patent/US20240123456",
    },
    {
      id: 3,
      title: "Hairpin Winding Motor Design",
      patentNumber: "EP-2024-0567890",
      applicant: "Bosch",
      filingDate: "2024-03-10",
      country: "Europe",
      summary: "헤어핀 권선 방식을 활용한 고출력 모터 설계 기술입니다.",
      technicalField: ["헤어핀 권선", "고출력", "소형화"],
      link: "https://patents.google.com/patent/EP20240567890",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="patents" onViewChange={() => {}} />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">
            특허 분석
          </h1>
          <p className="text-muted-foreground">
            EV 모터 기술 관련 주요 특허 동향 분석
          </p>
        </div>

        <div className="grid gap-6">
          {patents.map((patent) => (
            <a 
              key={patent.id} 
              href={patent.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block transition-transform hover:scale-[1.01]"
            >
              <Card className="p-6 card-glow cursor-pointer">
                <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{patent.title}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{patent.patentNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span>{patent.applicant}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{patent.filingDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span>{patent.country}</span>
                    </div>
                  </div>
                </div>

                <p className="text-foreground">{patent.summary}</p>

                <div className="flex flex-wrap gap-2">
                  {patent.technicalField.map((field, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm"
                    >
                      {field}
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

export default Patents;
