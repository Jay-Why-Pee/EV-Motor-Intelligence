import { Activity, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Header = () => {
  const [visitCount, setVisitCount] = useState<number | null>(null);

  useEffect(() => {
    const increment = async () => {
      const alreadyCounted = sessionStorage.getItem("ax_visit_counted");
      if (!alreadyCounted) {
        const { data } = await supabase.rpc('increment_visit_count');
        if (typeof data === 'number') setVisitCount(data);
        sessionStorage.setItem("ax_visit_counted", "true");
      } else {
        const { data } = await supabase.from('visit_counter').select('count').eq('id', 1).single();
        if (data) setVisitCount(data.count);
      }
    };
    increment();
  }, []);

  const now = new Date();
  const timeString = now.toLocaleString('ko-KR', { 
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gradient mb-2">
              EV Motor Lens
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              실시간 시장 인텔리전스 & 트렌드 모니터링
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30">
              <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
              <span className="text-primary font-medium">Updated every other day, 6 AM (KST)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-muted-foreground">
                <Activity className="w-4 h-4" />
                <span>{timeString}</span>
              </div>
              {visitCount !== null && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>Visits <span className="font-semibold text-foreground">{visitCount.toLocaleString()}</span></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
