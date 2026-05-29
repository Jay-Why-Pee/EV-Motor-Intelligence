import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Loader2, Brain, ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Patents = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [searchKeywords, setSearchKeywords] = useState<any[]>([]);
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
          setInsights(content.insights || []);
          setSearchKeywords(content.searchKeywords || []);
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
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">특허 동향 분석</h1>
          <p className="text-muted-foreground">EV 모터 기술 관련 특허 동향을 AI가 뉴스 기반으로 분석합니다</p>
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
            {/* AI Insights */}
            {insights.length > 0 && (
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">AI 특허 동향 분석</h2>
                </div>
                {insights.map((insight: any, idx: number) => (
                  <Card key={idx} className="p-5 card-glow border-primary/20">
                    <h3 className="font-semibold mb-2">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{insight.content}</p>
                  </Card>
                ))}
              </div>
            )}

            {/* Search Keywords */}
            {searchKeywords.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Espacenet에서 검색하기</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Google Patents는 일부 네트워크에서 차단되어, 유럽특허청(EPO)이 운영하는 무료 글로벌 특허 검색 서비스인 <strong>Espacenet</strong>으로 연결됩니다. 키워드를 클릭하면 관련 특허를 바로 조회할 수 있습니다.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {searchKeywords.map((item: any, idx: number) => (
                    <a
                      key={idx}
                      href={`https://worldwide.espacenet.com/patent/search?q=${encodeURIComponent(item.keyword)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block transition-transform hover:scale-[1.01]"
                    >
                      <Card className="p-4 card-glow hover:border-primary/40 transition-colors h-full">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm mb-1">{item.keyword}</h3>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                      </Card>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {insights.length === 0 && searchKeywords.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">아직 생성된 특허 분석 데이터가 없습니다. 뉴스가 수집되면 자동으로 업데이트됩니다.</p>
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
