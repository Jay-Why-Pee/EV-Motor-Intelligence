import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Loader2, Brain, ExternalLink, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Paper {
  id: string;
  title: string;
  summary: string;
  authors: string | null;
  venue: string | null;
  published_date: string | null;
  url: string;
  source: string;
  keyword: string | null;
}

const Research = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insightsRes, papersRes] = await Promise.all([
          supabase.from('market_analysis').select('*').eq('type', 'research').maybeSingle(),
          supabase.from('research_papers').select('*').order('created_at', { ascending: false }).limit(40),
        ]);
        if (insightsRes.data?.content) {
          const c = insightsRes.data.content as any;
          setInsights(c.insights || []);
          setLastUpdated(insightsRes.data.generated_at);
        }
        if (papersRes.data) setPapers(papersRes.data as Paper[]);
      } catch (e) {
        console.error('Error fetching research:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="research" onViewChange={() => {}} />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">연구 동향 분석</h1>
          <p className="text-muted-foreground">
            AI가 arXiv·IEEE·MDPI 등에서 실제 EV 모터 논문을 수집·읽어 한국어로 요약합니다. 카드 클릭 시 원문으로 이동합니다.
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              마지막 업데이트: {new Date(lastUpdated).toLocaleString('ko-KR')}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {insights.length > 0 && (
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">AI 연구 동향 인사이트</h2>
                </div>
                {insights.map((insight: any, idx: number) => (
                  <Card key={idx} className="p-5 card-glow border-primary/20">
                    <h3 className="font-semibold mb-2">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{insight.content}</p>
                  </Card>
                ))}
              </div>
            )}

            {papers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">최신 논문 ({papers.length}건)</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {papers.map((p) => (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block transition-transform hover:scale-[1.01]"
                    >
                      <Card className="p-5 card-glow hover:border-primary/40 transition-colors h-full">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm leading-snug">{p.title}</h3>
                          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
                          {p.authors && <Badge variant="secondary">{p.authors}</Badge>}
                          {p.venue && <Badge variant="outline">{p.venue}</Badge>}
                          {p.published_date && <Badge variant="outline">{p.published_date}</Badge>}
                          <Badge variant="outline">{p.source}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.summary}</p>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {insights.length === 0 && papers.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  아직 수집된 논문이 없습니다. 자동 동기화가 실행되면 표시됩니다.
                </p>
              </Card>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Research;
