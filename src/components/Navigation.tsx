import { BarChart3, Newspaper, Lightbulb, Sparkles, BookOpen, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate, useLocation } from "react-router-dom";

interface NavigationProps {
  activeView: "charts" | "news" | "insights" | "diy-insights" | "research" | "patents";
  onViewChange: (view: "charts" | "news" | "insights" | "diy-insights" | "research" | "patents") => void;
}

export const Navigation = ({ activeView, onViewChange }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (view: "charts" | "news" | "insights" | "diy-insights" | "research" | "patents") => {
    onViewChange(view);
    const routes = {
      charts: "/",
      news: "/",
      insights: "/insights",
      "diy-insights": "/diy-insights",
      research: "/research",
      patents: "/patents"
    };
    navigate(routes[view]);
  };

  return (
    <nav className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-[88px] md:top-[104px] z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          <Button
            variant={activeView === "charts" ? "default" : "ghost"}
            onClick={() => handleNavigation("charts")}
            className="flex items-center gap-2 shrink-0"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">차트</span>
            <span className="sm:hidden">차트</span>
          </Button>
          <Button
            variant={activeView === "news" ? "default" : "ghost"}
            onClick={() => handleNavigation("news")}
            className="flex items-center gap-2 shrink-0"
          >
            <Newspaper className="w-4 h-4" />
            <span className="hidden sm:inline">뉴스</span>
            <span className="sm:hidden">뉴스</span>
          </Button>
          <Button
            variant={activeView === "insights" ? "default" : "ghost"}
            onClick={() => handleNavigation("insights")}
            className="flex items-center gap-2 shrink-0"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">인사이트</span>
            <span className="sm:hidden">인사이트</span>
          </Button>
          <Button
            variant={activeView === "diy-insights" ? "default" : "ghost"}
            onClick={() => handleNavigation("diy-insights")}
            className="flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">인사이트 DIY</span>
            <span className="sm:hidden">DIY</span>
          </Button>
          <Button
            variant={activeView === "research" ? "default" : "ghost"}
            onClick={() => handleNavigation("research")}
            className="flex items-center gap-2 shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">논문</span>
            <span className="sm:hidden">논문</span>
          </Button>
          <Button
            variant={activeView === "patents" ? "default" : "ghost"}
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
