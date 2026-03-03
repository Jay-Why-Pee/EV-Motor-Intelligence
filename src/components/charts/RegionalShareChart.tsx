import { Card } from "../ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const defaultData = [
  { name: "중국", value: 38.5 },
  { name: "유럽", value: 28.2 },
  { name: "북미", value: 18.7 },
  { name: "일본", value: 8.4 },
  { name: "기타", value: 6.2 },
];

interface RegionalShareChartProps {
  data?: any[];
}

export const RegionalShareChart = ({ data }: RegionalShareChartProps) => {
  const chartData = (data || defaultData).map((d: any, i: number) => ({
    ...d,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-bold mb-2">지역별 시장 점유율</h3>
        <p className="text-sm text-muted-foreground">뉴스 기반 AI 분석 (%)</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => `${value.toFixed(1)}%`}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
