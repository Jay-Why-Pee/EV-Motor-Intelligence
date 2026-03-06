import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { NewsView } from "@/components/NewsView";

const News = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="news" />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <NewsView />
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

export default News;
