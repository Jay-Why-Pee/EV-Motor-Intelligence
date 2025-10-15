import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  id: string;
  content: string;
  generated_at: string;
  news_analyzed_count: number;
}

export const InsightsSection = () => {
  const [insight, setInsight] = useState<Insight | null>(null);
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
          <h2 className="text-2xl font-bold">AI 시장 인사이트</h2>
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

      {insight ? (
        <Card className="p-6 card-glow">
          <div className="prose prose-invert max-w-none">
            <div className="text-sm text-muted-foreground mb-4">
              분석 시간: {new Date(insight.generated_at).toLocaleString('ko-KR')} | 
              분석 뉴스: {insight.news_analyzed_count}개
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">
              {insight.content}
            </div>
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
