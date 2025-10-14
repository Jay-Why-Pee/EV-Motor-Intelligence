import { Activity } from "lucide-react";

export const Header = () => {
  const now = new Date();
  const timeString = now.toLocaleString('ko-KR', { 
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gradient mb-2">
              글로벌 EV 모터 시장 분석 대시보드
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              실시간 시장 인텔리전스 & 뉴스 모니터링
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30">
              <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
              <span className="text-primary font-medium">실시간 업데이트</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>{timeString}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
