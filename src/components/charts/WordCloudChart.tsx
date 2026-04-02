import { Card } from "../ui/card";
import { useMemo } from "react";

interface WordItem {
  text: string;
  value: number;
}

interface Props {
  data?: WordItem[];
}

export const WordCloudChart = ({ data }: Props) => {
  const words = useMemo(() => {
    if (!data?.length) return [];

    const sorted = [...data].sort((a, b) => b.value - a.value);
    const count = sorted.length;

    const colors = [
      "hsl(var(--primary))",
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
      "hsl(var(--destructive))",
    ];

    // Use rank-based sizing to guarantee monotonic decrease regardless of value distribution
    return sorted.map((item, idx) => {
      const rankRatio = 1 - idx / Math.max(count - 1, 1); // 1.0 (top) → 0.0 (bottom)
      const fontSize = 16 + rankRatio * 40; // 16px (lowest) → 56px (highest)
      return {
        ...item,
        fontSize,
        color: colors[idx % colors.length],
        opacity: 0.55 + rankRatio * 0.45,
      };
    });
  }, [data]);

  if (!words.length) return null;

  return (
    <Card className="p-4 md:p-6 card-glow">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-1">🔑 Motor Technology Keyword Cloud</h3>
        <p className="text-sm text-muted-foreground">뉴스·논문·특허 기반 기술 키워드 빈도</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 py-6 min-h-[280px]">
        {words.map((word, idx) => (
          <span
            key={idx}
            className="inline-block font-bold transition-transform hover:scale-110 cursor-default select-none"
            style={{
              fontSize: `${word.fontSize}px`,
              color: word.color,
              opacity: word.opacity,
              lineHeight: 1.2,
            }}
            title={`${word.text}: ${word.value}`}
          >
            {word.text}
          </span>
        ))}
      </div>
    </Card>
  );
};
