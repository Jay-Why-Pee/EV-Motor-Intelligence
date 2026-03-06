import { ExternalLink, Calendar, Building2 } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface NewsCardProps {
  title: string;
  title_kr: string;
  summary: string;
  category: string[];
  source: string;
  date: string;
  url: string;
}

export const NewsCard = ({ title_kr, summary, category, source, date, url }: NewsCardProps) => {
  const isValidUrl = url && url.startsWith('http');

  const handleClick = (e: React.MouseEvent) => {
    if (!isValidUrl) {
      e.preventDefault();
    }
  };

  return (
    <a 
      href={isValidUrl ? url : '#'} 
      target={isValidUrl ? "_blank" : undefined}
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block h-full"
    >
      <Card className="p-5 card-glow group cursor-pointer h-full flex flex-col hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            {category.map((cat, idx) => (
              <Badge key={idx} variant="outline" className="bg-primary/20 text-primary border-primary/30">
                {cat}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {!isValidUrl && (
              <span className="text-xs text-destructive">링크 없음</span>
            )}
            <ExternalLink className={`w-4 h-4 transition-colors ${isValidUrl ? 'text-muted-foreground group-hover:text-primary' : 'text-muted-foreground/30'}`} />
          </div>
        </div>
        
        <h3 className="font-bold text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {title_kr}
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
