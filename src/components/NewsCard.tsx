import { Calendar, Building2 } from "lucide-react";
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
  onClick?: () => void;
}

export const NewsCard = ({ title_kr, summary, category, source, date, onClick }: NewsCardProps) => {
  return (
    <div onClick={onClick} className="block h-full cursor-pointer">
      <Card className="p-5 card-glow group h-full flex flex-col hover:shadow-lg transition-shadow">
        <div className="flex flex-wrap gap-2 mb-3">
          {category.map((cat, idx) => (
            <Badge key={idx} variant="outline" className="bg-primary/20 text-primary border-primary/30">
              {cat}
            </Badge>
          ))}
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
    </div>
  );
};
