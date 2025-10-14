import { BarChart3, Newspaper } from "lucide-react";
import { Button } from "./ui/button";

interface NavigationProps {
  activeView: "charts" | "news";
  onViewChange: (view: "charts" | "news") => void;
}

export const Navigation = ({ activeView, onViewChange }: NavigationProps) => {
  return (
    <nav className="border-b border-border bg-card/30 backdrop-blur-sm sticky top-[88px] md:top-[104px] z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex gap-2">
          <Button
            variant={activeView === "charts" ? "default" : "ghost"}
            onClick={() => onViewChange("charts")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">차트 분석</span>
            <span className="sm:hidden">차트</span>
          </Button>
          <Button
            variant={activeView === "news" ? "default" : "ghost"}
            onClick={() => onViewChange("news")}
            className="flex items-center gap-2"
          >
            <Newspaper className="w-4 h-4" />
            <span className="hidden sm:inline">뉴스 & 인사이트</span>
            <span className="sm:hidden">뉴스</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};
