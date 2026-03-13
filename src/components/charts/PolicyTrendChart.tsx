import { Card } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--secondary))"
];

interface Props { data?: any[] }

export const PolicyTrendChart = ({ data }: Props) => {
  if (!data?.length) return null;

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">📋 정책·규제 트렌드</h3>
        <p className="text-sm text-muted-foreground">정책별 언급량 및 모터기술 영향도 스코어</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
          <YAxis type="category" dataKey="policy" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} width={120} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
          />
          <Bar dataKey="mentions" name="언급량" radius={[0, 8, 8, 0]}>
            {data.map((_: any, i: number) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
        {data.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/30">
            <span className="truncate mr-2">{p.policy}</span>
            <span className="font-bold text-primary shrink-0">영향도 {p.impact}/10</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
