import { Card } from "../ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--destructive))"
];

interface Props { data?: any[] }

export const PatentTrendChart = ({ data }: Props) => {
  if (!data?.length) return null;
  const companies = Object.keys(data[0]).filter(k => k !== "year");

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">📈 기업별 특허 출원량 추세</h3>
        <p className="text-sm text-muted-foreground">연간 EV 모터 관련 특허 출원 수 추정</p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          {companies.map((c, i) => (
            <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
