import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { WordCloudChart } from "./charts/WordCloudChart";
import { MotorSpecsTable } from "./charts/MotorSpecsTable";
import { RoadmapTimeline } from "./charts/RoadmapTimeline";
import { supabase } from "@/integrations/supabase/client";

export const ChartsView = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data: result, error } = await supabase
        .from("market_analysis")
        .select("*")
        .eq("type", "dashboard_v2")
        .maybeSingle();

      if (!error && result?.content) {
        setData(result.content as any);
        setLastUpdated(result.generated_at);
      }
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold">대시보드 데이터 준비 중</h2>
        <p className="text-muted-foreground">
          뉴스 자동 업데이트 시 대시보드 데이터가 함께 생성됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          마지막 업데이트: {new Date(lastUpdated).toLocaleString("ko-KR")}
        </p>
      )}

      <WordCloudChart data={data.wordCloud} />
      <MotorSpecsTable data={data.motorSpecs} />
      <RoadmapTimeline prm={data.roadmap?.prm} trm={data.roadmap?.trm} />
    </div>
  );
};
