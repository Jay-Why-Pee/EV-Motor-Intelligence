import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, TrendingUp, ExternalLink, Calendar, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Source {
  title_kr: string;
  source: string;
  date: string;
  url: string;
}

interface ExternalRef {
  name: string;
  description: string;
}

interface BriefingCard {
  title: string;
  summary: string;
  detail: string;
  sources: Source[];
  externalReferences: ExternalRef[];
}

const TrendBriefing = () => {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<BriefingCard[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BriefingCard | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!topic.trim()) {
      toast({ title: "주제를 입력해주세요", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setCards([]);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('trend-briefing', {
        body: { topic: topic.trim() }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: "오류", description: data.error, variant: "destructive" });
        return;
      }

      setCards(data.cards || []);
      if ((data.cards || []).length === 0) {
        toast({ title: "관련 트렌드를 찾지 못했습니다", description: "다른 주제로 다시 시도해보세요." });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "분석 실패", description: "트렌드 분석 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="trend-briefing" onViewChange={() => {}} />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">트렌드 브리핑</h1>
          <p className="text-muted-foreground">
            주제를 입력하면 AI가 관련 뉴스를 분석하여 트렌드 카드로 정리해드립니다
          </p>
        </div>

        <Card className="p-6 card-glow mb-6">
          <div className="flex gap-3">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예: 800V 플랫폼 트렌드, SiC 모터 기술 동향, 중국 EV 시장"
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading || !topic.trim()} size="lg">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  분석
                </>
              )}
            </Button>
          </div>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">AI가 트렌드를 분석하고 있습니다...</span>
          </div>
        )}

        {!isLoading && cards.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {cards.length}개의 트렌드 카드가 생성되었습니다
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card, idx) => (
                <Card
                  key={idx}
                  className="card-glow group cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
                  onClick={() => setSelectedCard(card)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col">
                    <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-4">
                      {card.summary}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                        출처 {card.sources.length}건
                      </Badge>
                      <span className="text-xs text-muted-foreground">클릭하여 상세보기</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {!isLoading && hasSearched && cards.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            관련 트렌드를 찾지 못했습니다. 다른 주제로 시도해보세요.
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedCard.title}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {selectedCard.summary}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="prose prose-sm prose-invert max-w-none">
                  {selectedCard.detail.split('\n').map((paragraph, i) => (
                    paragraph.trim() ? <p key={i} className="text-foreground/90 leading-relaxed">{paragraph}</p> : null
                  ))}
                </div>

                {selectedCard.sources.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">출처 뉴스</h4>
                    <div className="space-y-2">
                      {selectedCard.sources.map((src, i) => {
                        const isValidUrl = src.url && src.url.startsWith('http');
                        return (
                          <a
                            key={i}
                            href={isValidUrl ? src.url : '#'}
                            target={isValidUrl ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            onClick={(e) => !isValidUrl && e.preventDefault()}
                            className={`block p-3 rounded-md border border-border hover:border-primary/50 transition-colors ${isValidUrl ? '' : 'opacity-60'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium line-clamp-1">{src.title_kr}</span>
                              {isValidUrl && <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {src.source}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {src.date}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 EV Market Intelligence Dashboard. All rights reserved.</p>
          <p className="mt-2">실시간 데이터 기반 전기차 모터 시장 분석 플랫폼</p>
        </div>
      </footer>
    </div>
  );
};

export default TrendBriefing;
