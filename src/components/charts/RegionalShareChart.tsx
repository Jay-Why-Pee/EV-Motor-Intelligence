import { Card } from "../ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const data = [
  { name: "중국", value: 38.5, color: "hsl(var(--chart-1))" },
  { name: "유럽", value: 28.2, color: "hsl(var(--chart-2))" },
  { name: "북미", value: 18.7, color: "hsl(var(--chart-3))" },
  { name: "일본", value: 8.4, color: "hsl(var(--chart-4))" },
  { name: "기타", value: 6.2, color: "hsl(var(--chart-5))" },
];

export const RegionalShareChart = () => {
  return (
    <a 
      href="https://www.iea.org/reports/global-ev-outlook-2024" 
      target="_blank" 
      rel="noopener noreferrer"
      className="block transition-transform hover:scale-[1.02]"
    >
      <Card className="p-4 md:p-6 card-glow cursor-pointer hover:border-primary/50">
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold mb-2">지역별 시장 점유율</h3>
          <p className="text-sm text-muted-foreground">2024년 기준 (%)</p>
          <p className="text-xs text-muted-foreground/70 mt-1">출처: International Energy Agency (IEA), Bloomberg NEF (2024)</p>
        </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))'
            }}
            formatter={(value: number) => `${value.toFixed(1)}%`}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => value}
          />
        </PieChart>
      </ResponsiveContainer>
      </Card>
    </a>
  );
};
