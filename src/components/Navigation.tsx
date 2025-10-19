import { BarChart3, Newspaper, Lightbulb } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate, useLocation } from "react-router-dom";

interface NavigationProps {
  activeView: "charts" | "news" | "insights";
  onViewChange: (view: "charts" | "news" | "insights") => void;
}

export const Navigation = ({ activeView, onViewChange }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (view: "charts" | "news" | "insights") => {
    onViewChange(view);
    if (view === "insights") {
      navigate("/insights");
    } else {
      navigate("/");
    }
  };

  return (
    <nav className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-[88px] md:top-[104px] z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex gap-2">
          <Button
            variant={activeView === "charts" ? "default" : "ghost"}
            onClick={() => handleNavigation("charts")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">차트 분석</span>
            <span className="sm:hidden">차트</span>
          </Button>
          <Button
            variant={activeView === "news" ? "default" : "ghost"}
            onClick={() => handleNavigation("news")}
            className="flex items-center gap-2"
          >
            <Newspaper className="w-4 h-4" />
            <span className="hidden sm:inline">뉴스</span>
            <span className="sm:hidden">뉴스</span>
          </Button>
          <Button
            variant={activeView === "insights" ? "default" : "ghost"}
            onClick={() => handleNavigation("insights")}
            className="flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">인사이트</span>
            <span className="sm:hidden">인사이트</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};
