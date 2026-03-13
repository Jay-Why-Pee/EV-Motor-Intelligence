import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Star } from "lucide-react";

interface PatentItem {
  rank: number;
  title: string;
  company: string;
  citations: number;
  tech: string;
}

interface Props { data?: PatentItem[] }

export const PatentInfluenceChart = ({ data }: Props) => {
  if (!data?.length) return null;

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">⭐ 영향력 상위 특허 TOP 10</h3>
        <p className="text-sm text-muted-foreground">인용 기반 영향력 랭킹</p>
      </div>
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
        {data.map((item) => (
          <div key={item.rank} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">
              {item.rank}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-tight">{item.title}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.company}</Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.tech}</Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Star className="w-3 h-3" /> {item.citations}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
