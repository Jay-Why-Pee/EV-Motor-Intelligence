import { Card } from "../ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))"
];

interface Props { data?: any[] }

export const ResearchTopicChart = ({ data }: Props) => {
  if (!data?.length) return null;
  const topics = Object.keys(data[0]).filter(k => k !== "period");

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">📈 연구 주제별 성장 곡선</h3>
        <p className="text-sm text-muted-foreground">분기별 논문 수 추정치 — "연구가 어디에 쏠리는가"</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          {topics.map((t, i) => (
            <Area
              key={t}
              type="monotone"
              dataKey={t}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};
