import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { WordCloudChart } from "./charts/WordCloudChart";
import { MotorSpecsTable } from "./charts/MotorSpecsTable";
import { RoadmapTimeline } from "./charts/RoadmapTimeline";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

export const ChartsView = () => {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);

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
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const { error } = await supabase.functions.invoke("analyze-dashboard");
      if (error) throw error;
      await fetchData(false);
      toast({
        title: "업데이트 완료",
        description: "최신 뉴스 기준으로 차트 데이터를 다시 생성했습니다.",
      });
    } catch (e) {
      console.error("Error refreshing dashboard:", e);
      toast({
        title: "업데이트 실패",
        description: "함수 호출 또는 네트워크 문제로 갱신하지 못했습니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

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
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {lastUpdated ? (
          <p className="text-xs text-muted-foreground">
            마지막 업데이트: {new Date(lastUpdated).toLocaleString("ko-KR")}
          </p>
        ) : <div />}
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      <WordCloudChart data={data.wordCloud} />
      <MotorSpecsTable data={data.motorSpecs} />
      <RoadmapTimeline prm={data.roadmap?.prm} trm={data.roadmap?.trm} />
    </div>
  );
};
