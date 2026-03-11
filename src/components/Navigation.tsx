import { BarChart3, Newspaper, Search, Lightbulb, Sparkles, BookOpen, FileText, TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate, useLocation } from "react-router-dom";

type ViewType = "charts" | "news" | "diy-news" | "trend-briefing" | "insights" | "diy-insights" | "research" | "patents";

interface NavigationProps {
  activeView: ViewType;
  onViewChange?: (view: ViewType) => void;
}

const routes: Record<ViewType, string> = {
  charts: "/",
  news: "/news",
  "diy-news": "/diy-news",
  "trend-briefing": "/trend-briefing",
  insights: "/insights",
  "diy-insights": "/diy-insights",
  research: "/research",
  patents: "/patents"
};

export const Navigation = ({ activeView, onViewChange }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentView: ViewType = (() => {
    const path = location.pathname;
    const entry = Object.entries(routes).find(([, route]) => route === path);
    return (entry?.[0] as ViewType) || activeView;
  })();

  const handleNavigation = (view: ViewType) => {
    onViewChange?.(view);
    navigate(routes[view]);
  };

  return (
    <nav className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-[88px] md:top-[104px] z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          <Button
            variant={currentView === "charts" ? "default" : "ghost"}
            onClick={() => handleNavigation("charts")}
            className="flex items-center gap-2 shrink-0"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">차트</span>
            <span className="sm:hidden">차트</span>
          </Button>
          <Button
            variant={currentView === "news" ? "default" : "ghost"}
            onClick={() => handleNavigation("news")}
            className="flex items-center gap-2 shrink-0"
          >
            <Newspaper className="w-4 h-4" />
            <span className="hidden sm:inline">뉴스</span>
            <span className="sm:hidden">뉴스</span>
          </Button>
          <Button
            variant={currentView === "diy-news" ? "default" : "ghost"}
            onClick={() => handleNavigation("diy-news")}
            className="flex items-center gap-2 shrink-0"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">뉴스 DIY</span>
            <span className="sm:hidden">뉴스DIY</span>
          </Button>
          <Button
            variant={currentView === "trend-briefing" ? "default" : "ghost"}
            onClick={() => handleNavigation("trend-briefing")}
            className="flex items-center gap-2 shrink-0"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">트렌드 브리핑</span>
            <span className="sm:hidden">브리핑</span>
          </Button>
          <Button
            variant={currentView === "insights" ? "default" : "ghost"}
            onClick={() => handleNavigation("insights")}
            className="flex items-center gap-2 shrink-0"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">인사이트</span>
            <span className="sm:hidden">인사이트</span>
          </Button>
          <Button
            variant={currentView === "diy-insights" ? "default" : "ghost"}
            onClick={() => handleNavigation("diy-insights")}
            className="flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">인사이트 DIY</span>
            <span className="sm:hidden">DIY</span>
          </Button>
          <Button
            variant={currentView === "research" ? "default" : "ghost"}
            onClick={() => handleNavigation("research")}
            className="flex items-center gap-2 shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">논문</span>
            <span className="sm:hidden">논문</span>
          </Button>
          <Button
            variant={currentView === "patents" ? "default" : "ghost"}
            onClick={() => handleNavigation("patents")}
            className="flex items-center gap-2 shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">특허</span>
            <span className="sm:hidden">특허</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};
