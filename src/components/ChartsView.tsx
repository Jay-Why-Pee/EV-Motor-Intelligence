import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { WordCloudChart } from "./charts/WordCloudChart";
import { MotorSpecsTable } from "./charts/MotorSpecsTable";
import { RoadmapTimeline } from "./charts/RoadmapTimeline";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ChartsView = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

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

  const generateData = async () => {
    setGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("analyze-dashboard");
      if (error) throw error;
      if (result?.error) {
        toast({ title: "오류", description: result.error, variant: "destructive" });
        return;
      }
      setData(result);
      setLastUpdated(new Date().toISOString());
      toast({ title: "분석 완료", description: "대시보드 데이터가 업데이트되었습니다." });
    } catch (e) {
      console.error("Error:", e);
      toast({ title: "분석 실패", description: "데이터 생성 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setGenerating(false);
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
        <h2 className="text-xl font-bold">대시보드 데이터 생성</h2>
        <p className="text-muted-foreground">
          수집된 뉴스·논문·특허 데이터를 AI가 분석하여<br />
          EV 모터 기술 트렌드 대시보드를 생성합니다.
        </p>
        <Button onClick={generateData} disabled={generating} size="lg">
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />AI 분석 중...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" />데이터 분석 시작</>
          )}
        </Button>
        {generating && (
          <p className="text-sm text-muted-foreground animate-pulse">
            뉴스·논문·특허 데이터를 종합 분석하고 있습니다. 잠시만 기다려주세요...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              마지막 업데이트: {new Date(lastUpdated).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={generateData} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          새로고침
        </Button>
      </div>

      <WordCloudChart data={data.wordCloud} />
      <MotorSpecsTable data={data.motorSpecs} />
      <RoadmapTimeline prm={data.roadmap?.prm} trm={data.roadmap?.trm} />
    </div>
  );
};
