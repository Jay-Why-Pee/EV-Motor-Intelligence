import { Calendar, Building2, ShieldAlert } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { getLinkBlockLabel } from "@/lib/linkValidation";

interface NewsCardProps {
  title: string;
  title_kr: string;
  summary: string;
  category: string[];
  source: string;
  date: string;
  url: string;
  linkVerified?: boolean;
  linkBlockedReason?: string | null;
}

export const NewsCard = ({ title_kr, summary, category, source, date, linkVerified, linkBlockedReason }: NewsCardProps) => {
  const showBlockedState = linkVerified === false;
  return (
    <div className="block h-full">
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
        
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground pt-3 border-t border-border">
          <div className="flex items-center gap-1 min-w-0">
            <Building2 className="w-3 h-3" />
            <span className="truncate">{source}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {showBlockedState && (
              <div className="flex items-center gap-1 text-destructive">
                <ShieldAlert className="w-3 h-3" />
                <span>{getLinkBlockLabel({ linkBlockedReason })}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{date}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
