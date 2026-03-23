import { BarChart3, Newspaper, Search, Lightbulb, Sparkles, BookOpen, FileText, TrendingUp, MessageSquarePlus, HelpCircle, History } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate, useLocation } from "react-router-dom";

type ViewType = "guide" | "trend-briefing" | "charts" | "news" | "diy-news" | "insights" | "diy-insights" | "research" | "patents" | "feedback" | "changelog";

interface NavigationProps {
  activeView: ViewType;
  onViewChange?: (view: ViewType) => void;
}

const routes: Record<ViewType, string> = {
  guide: "/guide",
  "trend-briefing": "/",
  charts: "/charts",
  news: "/news",
  "diy-news": "/diy-news",
  insights: "/insights",
  "diy-insights": "/diy-insights",
  research: "/research",
  patents: "/patents",
  feedback: "/feedback",
  changelog: "/changelog",
};

const navItems: { view: ViewType; icon: typeof HelpCircle; label: string; shortLabel: string }[] = [
  { view: "guide", icon: HelpCircle, label: "가이드", shortLabel: "가이드" },
  { view: "trend-briefing", icon: TrendingUp, label: "트렌드 브리핑", shortLabel: "브리핑" },
  { view: "charts", icon: BarChart3, label: "차트", shortLabel: "차트" },
  { view: "news", icon: Newspaper, label: "뉴스", shortLabel: "뉴스" },
  { view: "diy-news", icon: Search, label: "뉴스 DIY", shortLabel: "뉴스DIY" },
  { view: "insights", icon: Lightbulb, label: "인사이트", shortLabel: "인사이트" },
  { view: "diy-insights", icon: Sparkles, label: "인사이트 DIY", shortLabel: "DIY" },
  { view: "research", icon: BookOpen, label: "논문", shortLabel: "논문" },
  { view: "patents", icon: FileText, label: "특허", shortLabel: "특허" },
  { view: "feedback", icon: MessageSquarePlus, label: "피드백", shortLabel: "피드백" },
  { view: "changelog", icon: History, label: "변경이력", shortLabel: "이력" },
];

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
          {navItems.map(({ view, icon: Icon, label, shortLabel }) => (
            <Button
              key={view}
              variant={currentView === view ? "default" : "ghost"}
              onClick={() => handleNavigation(view)}
              className="flex items-center gap-2 shrink-0"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
};
