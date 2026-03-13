import { Card } from "../ui/card";

interface Props { data?: any[] }

export const OEMHeatmapChart = ({ data }: Props) => {
  if (!data?.length) return null;
  const keywords = Object.keys(data[0]).filter(k => k !== "company");
  const maxVal = Math.max(...data.flatMap((d: any) => keywords.map(k => Number(d[k]) || 0)), 1);

  const getOpacity = (val: number) => Math.max(val / maxVal, 0.08);

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">🔥 OEM·Tier1별 이슈 히트맵</h3>
        <p className="text-sm text-muted-foreground">뉴스 노출 빈도 (색이 진할수록 높음)</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-muted-foreground font-medium">기업</th>
              {keywords.map(k => (
                <th key={k} className="p-2 text-muted-foreground font-medium text-center text-xs">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.company} className="border-t border-border/50">
                <td className="p-2 font-medium whitespace-nowrap">{row.company}</td>
                {keywords.map(k => {
                  const val = Number(row[k]) || 0;
                  return (
                    <td key={k} className="p-1.5 text-center">
                      <div
                        className="mx-auto w-10 h-10 rounded-md flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: `hsl(var(--chart-1) / ${getOpacity(val)})` }}
                      >
                        {val}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
