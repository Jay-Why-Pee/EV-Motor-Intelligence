import { ExternalLink, Calendar, Building2 } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface NewsCardProps {
  title: string;
  summary: string;
  category: "breaking" | "tech" | "market" | "korea";
  source: string;
  date: string;
  url: string;
}

const categoryStyles = {
  breaking: "bg-destructive/20 text-destructive border-destructive/30",
  tech: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  market: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  korea: "bg-chart-1/20 text-chart-1 border-chart-1/30",
};

const categoryLabels = {
  breaking: "속보",
  tech: "기술",
  market: "시장",
  korea: "국내",
};

export const NewsCard = ({ title, summary, category, source, date, url }: NewsCardProps) => {
  return (
    <Card className="p-5 card-glow group cursor-pointer h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <Badge variant="outline" className={categoryStyles[category]}>
          {categoryLabels[category]}
        </Badge>
        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      
      <h3 className="font-bold text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-grow">
        {summary}
      </p>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          <span>{source}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{date}</span>
        </div>
      </div>
    </Card>
  );
};
