import { Card } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))"
];

interface Props { data?: any[] }

export const CountryResearchChart = ({ data }: Props) => {
  if (!data?.length) return null;

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">🌐 국가/기관별 연구 집중도</h3>
        <p className="text-sm text-muted-foreground">국가별 EV 모터 관련 논문 수 및 비중</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="country" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
            formatter={(value: number, name: string) => [name === "papers" ? `${value}편` : `${value}%`, name === "papers" ? "논문 수" : "비중"]}
          />
          <Bar dataKey="papers" name="논문 수" radius={[8, 8, 0, 0]}>
            {data.map((_: any, i: number) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {data.map((d: any, i: number) => (
          <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted/40">
            {d.country}: {d.ratio}%
          </span>
        ))}
      </div>
    </Card>
  );
};
