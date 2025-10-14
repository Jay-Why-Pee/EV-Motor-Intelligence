import { Card } from "../ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { year: "2020", market: 28.5, forecast: 28.5 },
  { year: "2021", market: 32.8, forecast: 32.8 },
  { year: "2022", market: 37.2, forecast: 37.2 },
  { year: "2023", market: 42.5, forecast: 42.5 },
  { year: "2024", market: null, forecast: 49.8 },
  { year: "2025", market: null, forecast: 58.4 },
  { year: "2026", market: null, forecast: 68.9 },
  { year: "2027", market: null, forecast: 81.2 },
  { year: "2028", market: null, forecast: 96.5 },
];

export const MarketSizeChart = () => {
  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-6">
        <h3 className="text-lg md:text-xl font-bold mb-2">글로벌 EV 모터 시장 규모</h3>
        <p className="text-sm text-muted-foreground">단위: 십억 달러 (Billion USD)</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="year" 
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
            formatter={(value) => value === 'market' ? '실제 시장 규모' : '예측 시장 규모'}
          />
          <Line 
            type="monotone" 
            dataKey="market" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="forecast" 
            stroke="hsl(var(--chart-2))" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
