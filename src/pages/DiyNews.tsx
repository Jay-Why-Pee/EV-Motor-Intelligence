import { useState } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NewsItem {
  id: string;
  title: string;
  title_kr: string;
  summary: string;
  category: string[];
  source: string;
  date: string;
  url: string;
}

const DiyNews = () => {
  const [prompt, setPrompt] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<NewsItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!prompt.trim()) {
      toast({ title: "검색어를 입력해주세요", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setResults([]);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('search-news', {
        body: { prompt: prompt.trim() }
      });

      if (error) throw error;

      setResults(data.results || []);
      if ((data.results || []).length === 0) {
        toast({ title: "관련 뉴스를 찾지 못했습니다", description: "다른 검색어로 다시 시도해보세요." });
      }
    } catch (error) {
      console.error('Error searching news:', error);
      toast({ title: "검색 실패", description: "뉴스 검색 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="diy-news" onViewChange={() => {}} />

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gradient">뉴스 DIY</h1>
          <p className="text-muted-foreground">
            검색어를 입력하여 크롤링된 뉴스 중 관련 기사를 찾아보세요
          </p>
        </div>

        <Card className="p-6 card-glow mb-6">
          <div className="flex gap-3">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예: SiC 인버터, 800V 시스템, 현대차 모터 전략"
              disabled={isSearching}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching || !prompt.trim()} size="lg">
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  검색
                </>
              )}
            </Button>
          </div>
        </Card>

        {isSearching && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">AI가 관련 뉴스를 검색하고 있습니다...</span>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {results.length}개의 관련 뉴스를 찾았습니다
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((news) => (
                <NewsCard key={news.id} {...news} />
              ))}
            </div>
          </>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            관련 뉴스를 찾지 못했습니다. 다른 검색어로 시도해보세요.
          </div>
        )}
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

export default DiyNews;
