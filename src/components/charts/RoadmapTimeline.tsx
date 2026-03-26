import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { ChevronRight } from "lucide-react";

interface RoadmapItem {
  year: string;
  category: string;
  title: string;
  description: string;
  status: "past" | "current" | "future";
}

interface Props {
  prm?: RoadmapItem[];
  trm?: RoadmapItem[];
}

const statusColors: Record<string, string> = {
  past: "bg-muted text-muted-foreground",
  current: "bg-primary text-primary-foreground",
  future: "bg-chart-2/20 text-chart-2 border border-chart-2/40",
};

const categoryColors: Record<string, string> = {
  PMSM: "bg-chart-1/20 text-chart-1",
  "Non-PMSM": "bg-chart-2/20 text-chart-2",
  P1: "bg-chart-3/20 text-chart-3",
  P2: "bg-chart-4/20 text-chart-4",
  P3: "bg-chart-5/20 text-chart-5",
  P4: "bg-primary/20 text-primary",
  BEV: "bg-destructive/20 text-destructive",
  xHEV: "bg-secondary text-secondary-foreground",
};

const TimelineView = ({ items, label }: { items: RoadmapItem[]; label: string }) => {
  const years = [...new Set(items.map(i => i.year))].sort();

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-base">{label}</h4>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-4 pl-10">
          {years.map(year => {
            const yearItems = items.filter(i => i.year === year);
            return (
              <div key={year} className="relative">
                <div className="absolute -left-10 top-1 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                  {year.slice(-2)}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">{year}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {yearItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border bg-card/50 space-y-1"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={categoryColors[item.category] || "bg-muted text-muted-foreground"}>
                            {item.category}
                          </Badge>
                          <Badge variant="outline" className={statusColors[item.status]}>
                            {item.status === "past" ? "완료" : item.status === "current" ? "진행중" : "예정"}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const RoadmapTimeline = ({ prm, trm }: Props) => {
  const [expanded, setExpanded] = useState(false);

  if (!prm?.length && !trm?.length) return null;

  const prmPreview = prm?.slice(0, 4) || [];
  const trmPreview = trm?.slice(0, 4) || [];

  return (
    <>
      <Card className="p-4 md:p-6 card-glow">
        <div className="mb-4">
          <h3 className="text-lg font-bold mb-1">🗺️ Product & Technical Roadmap</h3>
          <p className="text-sm text-muted-foreground">EV 모터 제품·기술 로드맵 타임라인</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {prmPreview.length > 0 && <TimelineView items={prmPreview} label="📦 Product Roadmap (PRM)" />}
          {trmPreview.length > 0 && <TimelineView items={trmPreview} label="🔧 Technical Roadmap (TRM)" />}
        </div>
        {((prm?.length || 0) > 4 || (trm?.length || 0) > 4) && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setExpanded(true)} className="gap-2">
              더 보기
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">🗺️ Product & Technical Roadmap</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pr-4">
              {prm && prm.length > 0 && <TimelineView items={prm} label="📦 Product Roadmap (PRM)" />}
              {trm && trm.length > 0 && <TimelineView items={trm} label="🔧 Technical Roadmap (TRM)" />}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
