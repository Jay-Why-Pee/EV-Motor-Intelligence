import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { BookOpen, Calendar, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Research = () => {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('market_analysis')
          .select('*')
          .eq('type', 'research')
          .maybeSingle();

        if (!error && data?.content) {
          const content = data.content as any;
          setPapers(content.papers || []);
          setLastUpdated(data.generated_at);
        }
      } catch (e) {
        console.error('Error fetching research data:', e);
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
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">논문 분석</h1>
          <p className="text-muted-foreground">EV 모터 기술 관련 최신 논문 분석 및 동향 (뉴스 기반 자동 업데이트)</p>
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
        ) : papers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">아직 생성된 논문 데이터가 없습니다. 뉴스가 수집되면 자동으로 업데이트됩니다.</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {papers.map((paper: any, idx: number) => (
              <a
                key={idx}
                href={paper.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-transform hover:scale-[1.01]"
              >
                <Card className="p-6 card-glow cursor-pointer">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">{paper.title}</h2>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                        {paper.authors && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{paper.authors}</span>
                          </div>
                        )}
                        {paper.journal && (
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            <span>{paper.journal}</span>
                          </div>
                        )}
                        {paper.year && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{paper.year}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-foreground">{paper.summary}</p>
                    {paper.keywords && (
                      <div className="flex flex-wrap gap-2">
                        {paper.keywords.map((keyword: string, kidx: number) => (
                          <span key={kidx} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Research;
