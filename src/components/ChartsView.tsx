import { TrendingUp, Globe, Zap, Users } from "lucide-react";
import { KPICard } from "./KPICard";
import { MarketSizeChart } from "./charts/MarketSizeChart";
import { RegionalShareChart } from "./charts/RegionalShareChart";
import { TechnologyTrendChart } from "./charts/TechnologyTrendChart";

export const ChartsView = () => {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="글로벌 시장 규모"
          value="$42.5B"
          change="+18.3%"
          icon={Globe}
          trend="up"
          source="Markets and Markets (2024)"
          sourceUrl="https://www.marketsandmarkets.com/Market-Reports/electric-vehicle-market-209371461.html"
        />
        <KPICard
          title="연간 성장률 (CAGR)"
          value="24.7%"
          change="+2.1%"
          icon={TrendingUp}
          trend="up"
          source="Grand View Research (2024)"
          sourceUrl="https://www.grandviewresearch.com/industry-analysis/electric-vehicle-market"
        />
        <KPICard
          title="주요 제조사"
          value="127"
          change="+15"
          icon={Users}
          trend="up"
          source="EV Database (2024)"
          sourceUrl="https://ev-database.org/cheatsheet/electric-vehicle-manufacturers"
        />
        <KPICard
          title="기술 혁신 지수"
          value="8.9/10"
          change="+0.4"
          icon={Zap}
          trend="up"
          source="McKinsey & Company (2024)"
          sourceUrl="https://www.mckinsey.com/industries/automotive-and-assembly/our-insights"
        />
      </div>

      {/* Market Size Chart */}
      <MarketSizeChart />

      {/* Regional and Technology Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegionalShareChart />
        <TechnologyTrendChart />
      </div>
    </div>
  );
};
