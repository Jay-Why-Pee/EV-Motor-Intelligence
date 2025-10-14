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
        />
        <KPICard
          title="연간 성장률 (CAGR)"
          value="24.7%"
          change="+2.1%"
          icon={TrendingUp}
          trend="up"
        />
        <KPICard
          title="주요 제조사"
          value="127"
          change="+15"
          icon={Users}
          trend="up"
        />
        <KPICard
          title="기술 혁신 지수"
          value="8.9/10"
          change="+0.4"
          icon={Zap}
          trend="up"
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
