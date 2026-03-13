import { Card } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--secondary))",
  "hsl(var(--destructive))", "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"
];

interface Props { data?: any[] }

export const RisingTechChart = ({ data }: Props) => {
  if (!data?.length) return null;
  const sorted = [...data].sort((a, b) => b.growth - a.growth).slice(0, 10);

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">🔥 상승 기술 카테고리 TOP 10</h3>
        <p className="text-sm text-muted-foreground">특허 증가율 기준 (%)</p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={sorted} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} unit="%" />
          <YAxis type="category" dataKey="tech" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} width={140} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
            formatter={(v: number) => [`${v}%`, "증가율"]}
          />
          <Bar dataKey="growth" name="증가율" radius={[0, 8, 8, 0]}>
            {sorted.map((_: any, i: number) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
