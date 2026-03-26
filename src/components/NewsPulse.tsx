import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Loader2 } from "lucide-react";

interface InsightSection {
  title: string;
  insights: string[];
}

interface InsightContent {
  summary: string;
  keywords: string[];
  sections: InsightSection[];
}

interface Insight {
  id: string;
  content: string;
  generated_at: string;
  news_analyzed_count: number;
}

export const NewsPulse = () => {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [parsedContent, setParsedContent] = useState<InsightContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInsight(); }, []);

  const fetchInsight = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setInsight(data);

      if (data?.content) {
        try {
          let cleanContent = data.content.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim();
          let parsed: InsightContent | null = null;
          try { parsed = JSON.parse(cleanContent); } catch {
            const match = cleanContent.match(/{[\s\S]*}/);
            if (match) parsed = JSON.parse(match[0]);
          }
          if (parsed) setParsedContent(parsed);
        } catch (e) {
          console.error('Failed to parse insight content:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching insight:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsight = async () => {
    try {
      setAnalyzing(true);
      toast({ title: "분석 시작", description: "AI가 뉴스를 분석하고 있습니다..." });
      const { data, error } = await supabase.functions.invoke('analyze-news');
      if (error) throw error;
      toast({ title: "분석 완료", description: `${data.insight.news_analyzed_count}개의 뉴스를 분석했습니다.` });
      await fetchInsight();
    } catch (error) {
      console.error('Error generating insight:', error);
      toast({ title: "분석 실패", description: "인사이트 생성 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-chart-3" />
        <h2 className="text-2xl font-bold">News Pulse</h2>
      </div>

      {insight && parsedContent ? (
        <Card className="p-5 card-glow">
          <div className="text-xs text-muted-foreground mb-3">
            분석 시간: {new Date(insight.generated_at).toLocaleString('ko-KR')} | 분석 뉴스: {insight.news_analyzed_count}개
          </div>
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm leading-relaxed">{parsedContent.summary}</p>
          </div>
          {parsedContent.sections.map((section, idx) => (
            <div key={idx} className="mb-4 last:mb-0">
              <h3 className="text-base font-semibold mb-2 text-primary">{section.title}</h3>
              <ul className="space-y-1">
                {section.insights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span className="flex-1 leading-relaxed">{ins}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {parsedContent.keywords?.length > 0 && (
            <div className="pt-3 border-t border-border mt-3">
              <div className="flex flex-wrap gap-1.5">
                {parsedContent.keywords.map((kw, idx) => (
                  <span key={idx} className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium border border-primary/30">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">아직 생성된 분석이 없습니다. 자동 업데이트 시 생성됩니다.</p>
        </Card>
      )}
    </div>
  );
};
