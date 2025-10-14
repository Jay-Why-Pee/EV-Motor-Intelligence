import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend: "up" | "down";
}

export const KPICard = ({ title, value, change, icon: Icon, trend }: KPICardProps) => {
  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className={`text-sm font-medium ${trend === 'up' ? 'text-primary' : 'text-secondary'}`}>
          {change}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl md:text-3xl font-bold">{value}</p>
      </div>
    </Card>
  );
};
