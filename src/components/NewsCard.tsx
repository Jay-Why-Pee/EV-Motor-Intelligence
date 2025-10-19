import { ExternalLink, Calendar, Building2 } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface NewsCardProps {
  title: string;
  summary: string;
  category: string;
  source: string;
  date: string;
  url: string;
}

export const NewsCard = ({ title, summary, category, source, date, url }: NewsCardProps) => {
  // Use category as label directly, fallback to "기타" if not available
  const categoryLabel = category || "기타";
  
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block h-full"
    >
      <Card className="p-5 card-glow group cursor-pointer h-full flex flex-col hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
            {categoryLabel}
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
    </a>
  );
};
