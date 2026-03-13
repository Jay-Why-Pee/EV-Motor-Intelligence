import { useEffect, useState } from "react";
import { TrendingUp, FileText, BookOpen, AlertTriangle, Building2, Loader2, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { KPICard } from "./KPICard";
import { KeywordTrendChart } from "./charts/KeywordTrendChart";
import { OEMHeatmapChart } from "./charts/OEMHeatmapChart";
import { PolicyTrendChart } from "./charts/PolicyTrendChart";
import { ResearchTopicChart } from "./charts/ResearchTopicChart";
import { CountryResearchChart } from "./charts/CountryResearchChart";
import { PatentTrendChart } from "./charts/PatentTrendChart";
import { RisingTechChart } from "./charts/RisingTechChart";
import { PatentInfluenceChart } from "./charts/PatentInfluenceChart";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const iconMap: Record<string, any> = {
  trend: TrendingUp,
  paper: BookOpen,
  patent: FileText,
  risk: AlertTriangle,
  company: Building2,
};

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

  useEffect(() => {
    fetchData();
  }, []);

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
          실시간 트렌드 모니터링 대시보드를 생성합니다.
        </p>
        <Button onClick={generateData} disabled={generating} size="lg">
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              AI 분석 중...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              데이터 분석 시작
            </>
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

  const kpis = data.kpis || [];

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Signal-based KPIs */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {kpis.map((kpi: any, idx: number) => {
            const IconComp = iconMap[kpi.iconType] || TrendingUp;
            return (
              <KPICard
                key={idx}
                title={kpi.title}
                value={kpi.value}
                change={kpi.change}
                icon={IconComp}
                trend={kpi.trend === "down" ? "down" : "up"}
              />
            );
          })}
        </div>
      )}

      {/* Tabbed Charts */}
      <Tabs defaultValue="news" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="news">📰 뉴스 기반</TabsTrigger>
          <TabsTrigger value="research">📚 논문 기반</TabsTrigger>
          <TabsTrigger value="patents">🧬 특허 기반</TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="space-y-6 mt-6">
          <KeywordTrendChart data={data.news?.keywordTrend} />
          <OEMHeatmapChart data={data.news?.oemHeatmap} />
          <PolicyTrendChart data={data.news?.policyTrend} />
        </TabsContent>

        <TabsContent value="research" className="space-y-6 mt-6">
          <ResearchTopicChart data={data.research?.topicTrend} />
          <CountryResearchChart data={data.research?.countryResearch} />
        </TabsContent>

        <TabsContent value="patents" className="space-y-6 mt-6">
          <PatentTrendChart data={data.patents?.companyTrend} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RisingTechChart data={data.patents?.risingTech} />
            <PatentInfluenceChart data={data.patents?.influenceTop} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
