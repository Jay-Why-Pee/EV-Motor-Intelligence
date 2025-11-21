import { useState, useEffect } from "react";
import { NewsCard } from "./NewsCard";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Category = "all" | "Asia" | "Europe" | "North America" | "China" | "GM" | "Ford" | "Mercedes-Benz" | "BMW" | "Volkswagen" | "Honda" | "Hyundai" | "Bosch" | "ZF" | "Schaeffler" | "LG Magna" | "Other";

interface NewsArticle {
  id: string;
  title: string;
  title_kr: string;
  summary: string;
  category: string[];
  source: string;
  date: string;
  url: string;
}

export const NewsView = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(20);
  const [crawling, setCrawling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      setNews((data || []) as NewsArticle[]);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const crawlNews = async () => {
    try {
      setCrawling(true);
      toast({
        title: "크롤링 시작",
        description: "뉴스를 수집하고 있습니다...",
      });

      const { error } = await supabase.functions.invoke('crawl-news');

      if (error) throw error;

      toast({
        title: "크롤링 완료",
        description: "새로운 뉴스를 불러왔습니다.",
      });

      await fetchNews();
      setActiveCategory("all");
      setDisplayCount(30);
    } catch (error) {
      console.error('Error crawling news:', error);
      toast({
        title: "크롤링 실패",
        description: "뉴스 수집 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setCrawling(false);
    }
  };

  const categories = [
    { id: "all" as const, label: "All", group: "" },
    // Regions
    { id: "Asia" as const, label: "Asia", group: "Region" },
    { id: "Europe" as const, label: "Europe", group: "Region" },
    { id: "North America" as const, label: "North America", group: "Region" },
    { id: "China" as const, label: "China", group: "Region" },
    // Customers
    { id: "GM" as const, label: "GM", group: "Customers" },
    { id: "Ford" as const, label: "Ford", group: "Customers" },
    { id: "Mercedes-Benz" as const, label: "Mercedes-Benz", group: "Customers" },
    { id: "BMW" as const, label: "BMW", group: "Customers" },
    { id: "Volkswagen" as const, label: "Volkswagen", group: "Customers" },
    { id: "Honda" as const, label: "Honda", group: "Customers" },
    { id: "Hyundai" as const, label: "Hyundai", group: "Customers" },
    // Motor manufacturers
    { id: "Bosch" as const, label: "Bosch", group: "Motor Manufacturers" },
    { id: "ZF" as const, label: "ZF", group: "Motor Manufacturers" },
    { id: "Schaeffler" as const, label: "Schaeffler", group: "Motor Manufacturers" },
    { id: "LG Magna" as const, label: "LG Magna", group: "Motor Manufacturers" },
    { id: "Other" as const, label: "Other", group: "Motor Manufacturers" },
  ];

  const filteredNews = activeCategory === "all" 
    ? news 
    : news.filter(article => article.category.includes(activeCategory));

  const displayedNews = filteredNews.slice(0, displayCount);
  const hasMore = displayedNews.length < filteredNews.length;

  const loadMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group categories by type
  const groupedCategories = [
    { label: "All", categories: categories.filter(c => c.id === "all") },
    { label: "Region", categories: categories.filter(c => c.group === "Region") },
    { label: "Customers", categories: categories.filter(c => c.group === "Customers") },
    { label: "Motor Manufacturers", categories: categories.filter(c => c.group === "Motor Manufacturers") },
  ];

  return (
    <div className="space-y-8">
      {/* Filter Buttons and Crawl Button */}
      <div className="space-y-4">
        {groupedCategories.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-2">
            {group.categories.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground">{group.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {group.categories.map(category => (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.id ? "default" : "outline"}
                      onClick={() => {
                        setActiveCategory(category.id);
                        setDisplayCount(20);
                      }}
                      size="sm"
                      className="transition-all"
                    >
                      {category.label}
                      {activeCategory === category.id && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
                          {category.id === "all" ? news.length : news.filter(n => n.category.includes(category.id)).length}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        <Button
          onClick={crawlNews}
          disabled={crawling}
          variant="outline"
          size="sm"
        >
          {crawling ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              수집중...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              뉴스 크롤링
            </>
          )}
        </Button>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {displayedNews.map(article => (
          <NewsCard key={article.id} {...article} />
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          해당 카테고리의 뉴스가 없습니다.
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={loadMore}
            variant="outline"
            size="lg"
            className="min-w-[200px]"
          >
          뉴스 더보기 ({displayedNews.length}/{filteredNews.length})
          </Button>
        </div>
      )}
    </div>
  );
};
