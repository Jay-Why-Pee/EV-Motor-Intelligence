import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export const InsightsSection = () => {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [parsedContent, setParsedContent] = useState<InsightContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInsight();
  }, []);

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
          const parsed = JSON.parse(data.content);
          setParsedContent(parsed);
        } catch (e) {
          console.error('Failed to parse insight content:', e);
          setParsedContent(null);
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
      toast({
        title: "분석 시작",
        description: "AI가 뉴스를 분석하고 있습니다. 잠시만 기다려주세요...",
      });

      const { data, error } = await supabase.functions.invoke('analyze-news');

      if (error) throw error;

      toast({
        title: "분석 완료",
        description: `${data.insight.news_analyzed_count}개의 뉴스를 분석했습니다.`,
      });

      await fetchInsight();
    } catch (error) {
      console.error('Error generating insight:', error);
      toast({
        title: "분석 실패",
        description: "인사이트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-chart-3" />
          <h2 className="text-2xl font-bold">인사이트 (상기 뉴스 기반)</h2>
        </div>
        <Button
          onClick={generateInsight}
          disabled={analyzing}
          variant="outline"
          size="sm"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              새로 분석
            </>
          )}
        </Button>
      </div>

      {insight && parsedContent ? (
        <div className="space-y-6">
          <Card className="p-6 card-glow">
            <div className="text-sm text-muted-foreground mb-4">
              분석 시간: {new Date(insight.generated_at).toLocaleString('ko-KR')} | 
              분석 뉴스: {insight.news_analyzed_count}개
            </div>
            
            <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-lg leading-relaxed">{parsedContent.summary}</p>
            </div>

            {parsedContent.sections.map((section, idx) => (
              <div key={idx} className="mb-6">
                <h3 className="text-xl font-semibold mb-3 text-primary">{section.title}</h3>
                <ul className="space-y-2">
                  {section.insights.map((insight, insightIdx) => (
                    <li key={insightIdx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="flex-1 leading-relaxed">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-chart-3" />
              핵심 키워드
            </h3>
            <div className="flex flex-wrap gap-2">
              {parsedContent.keywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-primary/20 text-primary rounded-full text-sm font-medium border border-primary/30"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </Card>
        </div>
      ) : insight ? (
        <Card className="p-6 card-glow">
          <div className="text-sm text-muted-foreground mb-4">
            분석 시간: {new Date(insight.generated_at).toLocaleString('ko-KR')} | 
            분석 뉴스: {insight.news_analyzed_count}개
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">
            {insight.content}
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            아직 생성된 인사이트가 없습니다.
          </p>
          <Button onClick={generateInsight} disabled={analyzing}>
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                분석 중...
              </>
            ) : (
              '첫 인사이트 생성하기'
            )}
          </Button>
        </Card>
      )}
    </div>
  );
};
