import { useEffect, useState } from "react";
import { TrendingUp, Globe, Zap, Users, Loader2 } from "lucide-react";
import { KPICard } from "./KPICard";
import { MarketSizeChart } from "./charts/MarketSizeChart";
import { RegionalShareChart } from "./charts/RegionalShareChart";
import { TechnologyTrendChart } from "./charts/TechnologyTrendChart";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, any> = { Globe, TrendingUp, Users, Zap };
const defaultKpis = [
  { title: "글로벌 시장 규모", value: "$42.5B", change: "+18.3%", trend: "up" as const, source: "Markets and Markets (2024)", sourceUrl: "https://www.marketsandmarkets.com/Market-Reports/electric-vehicle-market-209371461.html" },
  { title: "연간 성장률 (CAGR)", value: "24.7%", change: "+2.1%", trend: "up" as const, source: "Grand View Research (2024)", sourceUrl: "https://www.grandviewresearch.com/industry-analysis/electric-vehicle-market" },
  { title: "주요 제조사", value: "127", change: "+15", trend: "up" as const, source: "EV Database (2024)", sourceUrl: "https://ev-database.org/cheatsheet/electric-vehicle-manufacturers" },
  { title: "기술 혁신 지수", value: "8.9/10", change: "+0.4", trend: "up" as const, source: "McKinsey & Company (2024)", sourceUrl: "https://www.mckinsey.com/industries/automotive-and-assembly/our-insights" },
];
const defaultIcons = [Globe, TrendingUp, Users, Zap];

export const ChartsView = () => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('market_analysis')
          .select('*')
          .eq('type', 'charts')
          .maybeSingle();

        if (!error && data?.content) {
          setChartData(data.content as any);
          setLastUpdated(data.generated_at);
        }
      } catch (e) {
        console.error('Error fetching chart data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const kpis = chartData?.kpis || defaultKpis;
  const marketSizeData = chartData?.marketSize;
  const regionalData = chartData?.regionalShare;
  const techData = chartData?.technologyTrend;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {lastUpdated && (
        <p className="text-xs text-muted-foreground text-right">
          마지막 업데이트: {new Date(lastUpdated).toLocaleString('ko-KR')}
        </p>
      )}
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi: any, idx: number) => (
          <KPICard
            key={idx}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            icon={defaultIcons[idx] || Globe}
            trend={kpi.trend === "down" ? "down" : "up"}
            source={kpi.source}
            sourceUrl={kpi.sourceUrl}
          />
        ))}
      </div>

      {/* Market Size Chart */}
      <MarketSizeChart data={marketSizeData} />

      {/* Regional and Technology Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegionalShareChart data={regionalData} />
        <TechnologyTrendChart data={techData} />
      </div>
    </div>
  );
};
