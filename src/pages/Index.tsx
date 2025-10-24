import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { ChartsView } from "@/components/ChartsView";
import { NewsView } from "@/components/NewsView";

const Index = () => {
  const [activeView, setActiveView] = useState<"charts" | "news" | "insights">("charts");

  const renderView = () => {
    if (activeView === "charts") return <ChartsView />;
    if (activeView === "news") return <NewsView />;
    return <ChartsView />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {renderView()}
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

export default Index;
