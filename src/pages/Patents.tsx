import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Loader2, Brain, ExternalLink, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Patent {
  id: string;
  title: string;
  summary: string;
  applicant: string | null;
  publication_number: string | null;
  filing_date: string | null;
  url: string;
  source: string;
  keyword: string | null;
}

const buildPatentAccessUrl = (patent: Patent) => {
  const pn = patent.publication_number?.trim();
  if (pn) return `https://patents.google.com/patent/${encodeURIComponent(pn)}/en`;
  if (patent.url && patent.url.startsWith('http') && !patent.url.includes('espacenet.com/patent/search')) {
    return patent.url;
  }
  return `https://patents.google.com/?q=${encodeURIComponent(patent.title)}`;
};

const Patents = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [insightsRes, patentsRes] = await Promise.all([
          supabase.from('market_analysis').select('*').eq('type', 'patents').maybeSingle(),
          supabase.from('patents').select('*').order('created_at', { ascending: false }).limit(40),
        ]);

        if (insightsRes.data?.content) {
          const c = insightsRes.data.content as any;
          setInsights(c.insights || []);
          setLastUpdated(insightsRes.data.generated_at);
        }
        if (patentsRes.data) setPatents(patentsRes.data as Patent[]);
      } catch (e) {
        console.error('Error fetching patents:', e);
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
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">특허 동향 분석</h1>
          <p className="text-muted-foreground">
            AI가 실제 EV 모터 관련 특허를 수집·읽어 한국어로 요약합니다. 카드 클릭 시 Google Patents 원문으로 이동합니다.
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
                  <h2 className="text-xl font-semibold">AI 특허 동향 인사이트</h2>
                </div>
                {insights.map((insight: any, idx: number) => (
                  <Card key={idx} className="p-5 card-glow border-primary/20">
                    <h3 className="font-semibold mb-2">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{insight.content}</p>
                  </Card>
                ))}
              </div>
            )}

            {patents.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">최신 특허 ({patents.length}건)</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {patents.map((p) => (
                    <a
                      key={p.id}
                      href={buildPatentAccessUrl(p)}
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
                          {p.applicant && <Badge variant="secondary">{p.applicant}</Badge>}
                          {p.publication_number && <Badge variant="outline">{p.publication_number}</Badge>}
                          {p.filing_date && <Badge variant="outline">{p.filing_date}</Badge>}
                          <Badge variant="outline">Google Patents</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.summary}</p>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {insights.length === 0 && patents.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  아직 수집된 특허가 없습니다. 자동 동기화가 실행되면 표시됩니다.
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

export default Patents;
