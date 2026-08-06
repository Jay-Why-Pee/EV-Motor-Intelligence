import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, TrendingUp, ExternalLink, Calendar, Building2, BookOpen, Clock, ShieldCheck, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getLinkBlockLabel, isVerifiedHttpUrl } from "@/lib/linkValidation";

interface Source {
  title_kr: string;
  source: string;
  date: string;
  url: string;
  linkVerified?: boolean;
  linkBlockedReason?: string | null;
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

interface BriefingHistoryItem {
  id: string;
  topic: string;
  cards: BriefingCard[];
  created_at: string;
}

const BriefingCardGrid = ({
  cards,
  onCardClick,
}: {
  cards: BriefingCard[];
  onCardClick: (card: BriefingCard) => void;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {cards.map((card, idx) => (
      <Card
        key={idx}
        className="card-glow group cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
        onClick={() => onCardClick(card)}
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
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                출처 {card.sources.length}건
              </Badge>
              {card.externalReferences?.length > 0 && (
                <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/30">
                  <BookOpen className="w-3 h-3 mr-1" />
                  외부 {card.externalReferences.length}건
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const CardDetailDialog = ({
  card,
  onClose,
}: {
  card: BriefingCard | null;
  onClose: () => void;
}) => (
  <Dialog open={!!card} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      {card && (
        <>
          <DialogHeader>
            <DialogTitle className="text-xl">{card.title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {card.summary}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="prose prose-sm prose-invert max-w-none">
              {card.detail.split('\n').map((paragraph, i) => (
                paragraph.trim() ? <p key={i} className="text-foreground/90 leading-relaxed">{paragraph}</p> : null
              ))}
            </div>

            {card.sources.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">출처 뉴스</h4>
                <div className="space-y-2">
                  {card.sources.map((src, i) => {
                    const isValidUrl = isVerifiedHttpUrl(src.url, src.linkVerified);
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
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {src.source}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {src.date}
                          </span>
                          {!isValidUrl && <span>{getLinkBlockLabel(src)}</span>}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {card.externalReferences?.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  AI 참고 자료
                </h4>
                <div className="space-y-2">
                  {card.externalReferences.map((ref, i) => (
                    <div key={i} className="p-3 rounded-md border border-border bg-muted/30">
                      <span className="text-sm font-medium">{ref.name}</span>
                      <p className="text-xs text-muted-foreground mt-1">{ref.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);

const TrendBriefing = () => {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentCards, setCurrentCards] = useState<BriefingCard[]>([]);
  const [currentTopic, setCurrentTopic] = useState("");
  const [history, setHistory] = useState<BriefingHistoryItem[]>([]);
  const [selectedCard, setSelectedCard] = useState<BriefingCard | null>(null);
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem("ax_admin") === "true");
  const [adminPw, setAdminPw] = useState(() => sessionStorage.getItem("ax_admin_pw") || "");
  const [adminOpen, setAdminOpen] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const verifyAdmin = async () => {
    if (!pwInput.trim()) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-briefing-history", {
        body: { masterPassword: pwInput, ids: [] },
      });
      if (error || data?.error) {
        toast({ title: "관리자 비밀번호가 올바르지 않습니다", variant: "destructive" });
        return;
      }
      sessionStorage.setItem("ax_admin", "true");
      sessionStorage.setItem("ax_admin_pw", pwInput);
      setAdminPw(pwInput);
      setIsAdmin(true);
      setAdminOpen(false);
      setPwInput("");
      toast({ title: "관리자 모드가 활성화되었습니다" });
    } finally {
      setVerifying(false);
    }
  };

  const exitAdmin = () => {
    sessionStorage.removeItem("ax_admin");
    sessionStorage.removeItem("ax_admin_pw");
    setIsAdmin(false);
    setAdminPw("");
    setSelectedIds([]);
  };

  const deleteHistory = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!window.confirm(`선택한 ${ids.length}건의 브리핑 기록을 삭제할까요?`)) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-briefing-history", {
        body: { masterPassword: adminPw, ids },
      });
      if (error || data?.error) {
        toast({ title: "삭제 실패", description: data?.error, variant: "destructive" });
        return;
      }
      toast({ title: `${ids.length}건이 삭제되었습니다` });
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      await fetchHistory();
    } finally {
      setDeleting(false);
    }
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('briefing_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setHistory(data.map((item: any) => ({
        id: item.id,
        topic: item.topic,
        cards: typeof item.cards === 'string' ? JSON.parse(item.cards) : item.cards,
        created_at: item.created_at,
      })));
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSearch = async () => {
    if (!topic.trim()) {
      toast({ title: "주제를 입력해주세요", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setCurrentCards([]);
    setCurrentTopic(topic.trim());

    try {
      const { data, error } = await supabase.functions.invoke('trend-briefing', {
        body: { topic: topic.trim() }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: "오류", description: data.error, variant: "destructive" });
        return;
      }

      const cards = data.cards || [];
      setCurrentCards(cards);
      if (cards.length === 0) {
        toast({ title: "관련 트렌드를 찾지 못했습니다", description: "다른 주제로 다시 시도해보세요." });
      } else {
        // Refresh history to include the new entry
        await fetchHistory();
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

        {/* Current search results */}
        {!isLoading && currentCards.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-primary text-primary-foreground">최신</Badge>
              <h2 className="text-lg font-semibold">"{currentTopic}"</h2>
              <span className="text-sm text-muted-foreground">— {currentCards.length}개 카드</span>
            </div>
            <BriefingCardGrid cards={currentCards} onCardClick={setSelectedCard} />
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">이전 브리핑 기록</h2>
              <span className="text-sm text-muted-foreground">(최대 10건)</span>
            </div>
            {history
              .filter((item) => !(currentCards.length > 0 && item.topic === currentTopic && history.indexOf(item) === 0))
              .map((item) => (
                <div key={item.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium">"{item.topic}"</h3>
                    <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                    <span className="text-xs text-muted-foreground">— {item.cards.length}개 카드</span>
                  </div>
                  <BriefingCardGrid cards={item.cards} onCardClick={setSelectedCard} />
                </div>
              ))}
          </div>
        )}

        {!isLoading && currentCards.length === 0 && history.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            주제를 입력하고 분석 버튼을 눌러 트렌드 브리핑을 시작하세요.
          </div>
        )}
      </main>

      <CardDetailDialog card={selectedCard} onClose={() => setSelectedCard(null)} />

      <Footer />
    </div>
  );
};

export default TrendBriefing;
