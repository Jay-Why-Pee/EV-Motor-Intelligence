import { Card } from "../ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--destructive))", "hsl(var(--secondary))"
];

interface Props { data?: any[] }

export const KeywordTrendChart = ({ data }: Props) => {
  if (!data?.length) return null;
  const keywords = Object.keys(data[0]).filter(k => k !== "month");

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">📈 기술 키워드 인기 변화 그래프</h3>
        <p className="text-sm text-muted-foreground">월별 뉴스 언급량 추이</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          {keywords.map((kw, i) => (
            <Line key={kw} type="monotone" dataKey={kw} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
