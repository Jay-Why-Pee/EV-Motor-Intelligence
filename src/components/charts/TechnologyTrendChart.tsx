import { Card } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { tech: "영구자석", adoption: 62, growth: 8.5 },
  { tech: "유도모터", adoption: 28, growth: 4.2 },
  { tech: "권선형", adoption: 7, growth: 12.8 },
  { tech: "SRM", adoption: 3, growth: 18.3 },
];

export const TechnologyTrendChart = () => {
  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-bold mb-2">모터 기술별 트렌드</h3>
        <p className="text-sm text-muted-foreground">채택률 vs 성장률</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="tech" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => value === 'adoption' ? '현재 채택률 (%)' : '연간 성장률 (%)'}
          />
          <Bar dataKey="adoption" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="growth" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
