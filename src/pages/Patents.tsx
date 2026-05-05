import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { FileText, Building, Calendar, Globe, Loader2, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { getLinkBlockLabel, isVerifiedHttpUrl } from "@/lib/linkValidation";

const Patents = () => {
  const [patents, setPatents] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('market_analysis')
          .select('*')
          .eq('type', 'patents')
          .maybeSingle();

        if (!error && data?.content) {
          const content = data.content as any;
          setPatents(content.patents || []);
          setInsights(content.insights || []);
          setLastUpdated(data.generated_at);
        }
      } catch (e) {
        console.error('Error fetching patents data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="patents" onViewChange={() => {}} />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">특허 분석</h1>
          <p className="text-muted-foreground">EV 모터 기술 관련 주요 특허 동향 분석 (최대 333개 누적, 매일 자동 업데이트)</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              마지막 업데이트: {new Date(lastUpdated).toLocaleString('ko-KR')} · 총 {patents.length}건
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* AI Insights */}
            {insights.length > 0 && (
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">AI 종합 분석</h2>
                </div>
                {insights.map((insight: any, idx: number) => (
                  <Card key={idx} className="p-5 card-glow border-primary/20">
                    <h3 className="font-semibold mb-2">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{insight.content}</p>
                  </Card>
                ))}
              </div>
            )}

            {patents.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">아직 생성된 특허 데이터가 없습니다. 뉴스가 수집되면 자동으로 업데이트됩니다.</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {patents.map((patent: any, idx: number) => (
                  <a key={idx}
                    href={patent.patentNumber ? `https://www.google.com/search?q=patent+${encodeURIComponent(patent.patentNumber)}` : '#'}
                    target={patent.patentNumber ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => !patent.patentNumber && e.preventDefault()}
                    className={`block transition-transform ${patent.patentNumber ? 'hover:scale-[1.01]' : 'cursor-default'}`}>
                    <Card className="p-6 card-glow cursor-pointer">
                      <div className="space-y-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h2 className="text-xl font-semibold">{patent.title}</h2>
                            {!patent.patentNumber && (
                              <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                                특허번호 없음
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground mb-4">
                            {patent.patentNumber && <div className="flex items-center gap-2"><FileText className="w-4 h-4" /><span>{patent.patentNumber}</span></div>}
                            {patent.applicant && <div className="flex items-center gap-2"><Building className="w-4 h-4" /><span>{patent.applicant}</span></div>}
                            {patent.filingDate && <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{patent.filingDate}</span></div>}
                            {patent.country && <div className="flex items-center gap-2"><Globe className="w-4 h-4" /><span>{patent.country}</span></div>}
                          </div>
                        </div>
                        <p className="text-foreground">{patent.summary}</p>
                        {patent.technicalField && (
                          <div className="flex flex-wrap gap-2">
                            {patent.technicalField.map((field: string, fi: number) => (
                              <span key={fi} className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm">{field}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Patents;
