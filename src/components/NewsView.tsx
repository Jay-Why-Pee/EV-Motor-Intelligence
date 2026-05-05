import { useState, useEffect } from "react";
import { NewsCard } from "./NewsCard";
import { NewsPulse } from "./NewsPulse";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, Brain, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getLinkBlockLabel, isVerifiedHttpUrl } from "@/lib/linkValidation";

type Category = "all" | "Asia" | "Europe" | "North America" | "China" | "GM" | "Ford" | "Mercedes-Benz" | "BMW" | "Volkswagen" | "Honda" | "Hyundai" | "Stellantis" | "Toyota" | "Tesla" | "Nissan" | "Renault" | "BYD" | "Xiaomi" | "Geely" | "Bosch" | "ZF" | "Schaeffler" | "LG Magna" | "Denso" | "Magna" | "Hyundai Mobis" | "AISIN" | "BorgWarner" | "Hitachi Astemo" | "Other";

interface NewsArticle {
  id: string;
  title: string;
  title_kr: string;
  summary: string;
  category: string[];
  source: string;
  date: string;
  url: string;
  linkVerified?: boolean;
  linkBlockedReason?: string | null;
}

interface CategoryInsight {
  title: string;
  content: string;
  sources: { title_kr: string; source: string; date: string; url: string; linkVerified?: boolean; linkBlockedReason?: string | null }[];
}

export const NewsView = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(20);
  const [crawling, setCrawling] = useState(false);
  
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsight[] | null>(null);
  const [analyzingCategory, setAnalyzingCategory] = useState(false);
  const [insightCache, setInsightCache] = useState<Record<string, CategoryInsight[]>>({});
  const { toast } = useToast();

  useEffect(() => { fetchNews(); }, []);

  useEffect(() => {
    if (activeCategory !== "all" && insightCache[activeCategory]) {
      setCategoryInsights(insightCache[activeCategory]);
    } else {
      setCategoryInsights(null);
    }
  }, [activeCategory, insightCache]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('news').select('*').order('date', { ascending: false });
      if (error) throw error;
      setNews(((data || []) as any[]).map((article) => ({
        ...article,
        linkVerified: article.link_verified ?? /^https?:\/\//i.test(article.url),
        linkBlockedReason: article.link_blocked_reason ?? null,
      })));
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const crawlNews = async () => {
    try {
      setCrawling(true);
      toast({ title: "크롤링 시작", description: "뉴스를 수집하고 있습니다..." });
      const { error } = await supabase.functions.invoke('crawl-news');
      if (error) throw error;
      toast({ title: "크롤링 완료", description: "새로운 뉴스를 불러왔습니다." });
      await fetchNews();
      setActiveCategory("all");
      setDisplayCount(30);
    } catch (error) {
      console.error('Error crawling news:', error);
      toast({ title: "크롤링 실패", description: "뉴스 수집 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setCrawling(false);
    }
  };

  const analyzeCategory = async () => {
    if (activeCategory === "all") return;
    setAnalyzingCategory(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-news-category', {
        body: { category: activeCategory }
      });
      if (error) throw error;
      if (data?.insights) {
        setCategoryInsights(data.insights);
        setInsightCache(prev => ({ ...prev, [activeCategory]: data.insights }));
      }
    } catch (error) {
      console.error('Error analyzing category:', error);
      toast({ title: "분석 실패", variant: "destructive" });
    } finally {
      setAnalyzingCategory(false);
    }
  };

  const categories = [
    { id: "all" as const, label: "All", group: "" },
    { id: "Asia" as const, label: "Asia", group: "Region" },
    { id: "Europe" as const, label: "Europe", group: "Region" },
    { id: "North America" as const, label: "North America", group: "Region" },
    { id: "China" as const, label: "China", group: "Region" },
    { id: "GM" as const, label: "GM", group: "Customers" },
    { id: "Ford" as const, label: "Ford", group: "Customers" },
    { id: "Mercedes-Benz" as const, label: "Mercedes-Benz", group: "Customers" },
    { id: "BMW" as const, label: "BMW", group: "Customers" },
    { id: "Volkswagen" as const, label: "Volkswagen", group: "Customers" },
    { id: "Honda" as const, label: "Honda", group: "Customers" },
    { id: "Hyundai" as const, label: "Hyundai", group: "Customers" },
    { id: "Stellantis" as const, label: "Stellantis", group: "Customers" },
    { id: "Toyota" as const, label: "Toyota", group: "Customers" },
    { id: "Tesla" as const, label: "Tesla", group: "Customers" },
    { id: "Nissan" as const, label: "Nissan", group: "Customers" },
    { id: "Renault" as const, label: "Renault", group: "Customers" },
    { id: "BYD" as const, label: "BYD", group: "Customers" },
    { id: "Xiaomi" as const, label: "Xiaomi", group: "Customers" },
    { id: "Geely" as const, label: "Geely", group: "Customers" },
    { id: "Bosch" as const, label: "Bosch", group: "Motor Manufacturers" },
    { id: "ZF" as const, label: "ZF", group: "Motor Manufacturers" },
    { id: "Schaeffler" as const, label: "Schaeffler", group: "Motor Manufacturers" },
    { id: "LG Magna" as const, label: "LG Magna", group: "Motor Manufacturers" },
    { id: "Denso" as const, label: "Denso", group: "Motor Manufacturers" },
    { id: "Magna" as const, label: "Magna", group: "Motor Manufacturers" },
    { id: "Hyundai Mobis" as const, label: "Hyundai Mobis", group: "Motor Manufacturers" },
    { id: "AISIN" as const, label: "AISIN", group: "Motor Manufacturers" },
    { id: "BorgWarner" as const, label: "BorgWarner", group: "Motor Manufacturers" },
    { id: "Hitachi Astemo" as const, label: "Hitachi Astemo", group: "Motor Manufacturers" },
    { id: "Other" as const, label: "Other", group: "Motor Manufacturers" },
  ];

  const filteredNews = activeCategory === "all" ? news : news.filter(a => a.category.includes(activeCategory));
  const displayedNews = filteredNews.slice(0, displayCount);
  const hasMore = displayedNews.length < filteredNews.length;

  const groupedCategories = [
    { label: "All", categories: categories.filter(c => c.id === "all") },
    { label: "Region", categories: categories.filter(c => c.group === "Region") },
    { label: "Customers", categories: categories.filter(c => c.group === "Customers") },
    { label: "Motor Manufacturers", categories: categories.filter(c => c.group === "Motor Manufacturers") },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* News Pulse */}
      <NewsPulse />

      {/* Filters */}
      <div className="space-y-4">
        {groupedCategories.map((group, gi) => (
          <div key={gi} className="space-y-2">
            {group.categories.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground">{group.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {group.categories.map(cat => (
                    <Button
                      key={cat.id}
                      variant={activeCategory === cat.id ? "default" : "outline"}
                      onClick={() => { setActiveCategory(cat.id); setDisplayCount(20); }}
                      size="sm"
                    >
                      {cat.label}
                      {activeCategory === cat.id && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
                          {cat.id === "all" ? news.length : news.filter(n => n.category.includes(cat.id)).length}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        <Button onClick={crawlNews} disabled={crawling} variant="outline" size="sm">
          {crawling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />수집중...</> : <><RefreshCw className="w-4 h-4 mr-2" />뉴스 크롤링</>}
        </Button>
      </div>

      {/* Category AI Analysis */}
      {activeCategory !== "all" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">"{activeCategory}" 카테고리 AI 분석</h2>
            <Button onClick={analyzeCategory} disabled={analyzingCategory} variant="outline" size="sm" className="ml-auto">
              {analyzingCategory ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />분석 중...</> : <><Brain className="w-3 h-3 mr-1" />AI 분석</>}
            </Button>
          </div>

          {analyzingCategory && !categoryInsights && (
            <Card className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">AI가 뉴스를 분석하고 있습니다...</p>
            </Card>
          )}

          {categoryInsights && categoryInsights.length > 0 && (
            <div className="space-y-4">
              {categoryInsights.map((insight, idx) => (
                <Card key={idx} className="p-5 card-glow border-primary/20">
                  <h3 className="font-semibold text-base mb-2">{insight.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{insight.content}</p>
                  {insight.sources && insight.sources.length > 0 && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">참고 기사</p>
                      {insight.sources.map((src, si) => {
                        const valid = isVerifiedHttpUrl(src.url, src.linkVerified);
                        return (
                          <a key={si} href={valid ? src.url : '#'} target={valid ? "_blank" : undefined} rel="noopener noreferrer"
                            onClick={e => !valid && e.preventDefault()}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                            {valid && <ExternalLink className="w-3 h-3 shrink-0" />}
                            <span className="line-clamp-1">{src.title_kr}</span>
                            <span className="shrink-0">— {src.source} ({src.date}){!valid ? ` · ${getLinkBlockLabel(src)}` : ''}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {displayedNews.map(article => (
          <a key={article.id} href={isVerifiedHttpUrl(article.url, article.linkVerified) ? article.url : '#'} target={isVerifiedHttpUrl(article.url, article.linkVerified) ? "_blank" : undefined} rel="noopener noreferrer" onClick={(e) => !isVerifiedHttpUrl(article.url, article.linkVerified) && e.preventDefault()} className={`block h-full ${isVerifiedHttpUrl(article.url, article.linkVerified) ? '' : 'cursor-default'}`}>
            <NewsCard {...article} />
          </a>
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">해당 카테고리의 뉴스가 없습니다.</div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={() => setDisplayCount(prev => prev + 10)} variant="outline" size="lg" className="min-w-[200px]">
            뉴스 더보기 ({displayedNews.length}/{filteredNews.length})
          </Button>
        </div>
      )}
    </div>
  );
};
