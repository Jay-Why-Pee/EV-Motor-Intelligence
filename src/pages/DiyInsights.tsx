import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DiyInsights = () => {
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string>("");
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      toast({
        title: "프롬프트를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setResult("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-custom-insight', {
        body: { prompt }
      });

      if (error) throw error;

      setResult(data.insight);
      toast({
        title: "분석 완료",
        description: "사용자 정의 인사이트가 생성되었습니다.",
      });
    } catch (error) {
      console.error('Error generating insight:', error);
      toast({
        title: "분석 실패",
        description: "인사이트 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="insights" onViewChange={() => {}} />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">
            인사이트 DIY
          </h1>
          <p className="text-muted-foreground">
            원하는 프롬프트를 입력하여 크롤링된 뉴스를 기반으로 맞춤형 인사이트를 생성하세요
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="p-6 card-glow">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  분석 프롬프트
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="예: 최근 전기차 배터리 기술 발전 동향을 요약해줘"
                  className="min-h-[120px] resize-none"
                  disabled={isAnalyzing}
                />
              </div>
              
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !prompt.trim()}
                className="w-full sm:w-auto"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    인사이트 분석
                  </>
                )}
              </Button>
            </div>
          </Card>

          {result && (
            <Card className="p-6 card-glow">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                생성된 인사이트
              </h2>
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-foreground">
                  {result}
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 EV Market Intelligence Dashboard. All rights reserved.</p>
          <p className="mt-2">실시간 데이터 기반 전기차 모터 시장 분석 플랫폼</p>
        </div>
      </footer>
    </div>
  );
};

export default DiyInsights;
