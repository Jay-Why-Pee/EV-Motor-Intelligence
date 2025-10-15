import { useState, useEffect } from "react";
import { NewsCard } from "./NewsCard";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { InsightsSection } from "./InsightsSection";

type Category = "all" | "breaking" | "tech" | "market" | "korea";

interface NewsArticle {
  id: string;
  title: string;
  title_kr: string;
  summary: string;
  category: "breaking" | "tech" | "market" | "korea" | "other";
  source: string;
  date: string;
  url: string;
}

export const NewsView = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(10);

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

  const categories = [
    { id: "all" as const, label: "전체" },
    { id: "breaking" as const, label: "속보" },
    { id: "tech" as const, label: "기술" },
    { id: "market" as const, label: "시장" },
    { id: "korea" as const, label: "국내" },
  ];

  const filteredNews = activeCategory === "all" 
    ? news 
    : news.filter(article => article.category === activeCategory);

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

  return (
    <div className="space-y-8">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? "default" : "outline"}
            onClick={() => {
              setActiveCategory(category.id);
              setDisplayCount(10);
            }}
            size="sm"
            className="transition-all"
          >
            {category.label}
            {activeCategory === category.id && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary-foreground text-primary">
                {category.id === "all" ? news.length : news.filter(n => n.category === category.id).length}
              </span>
            )}
          </Button>
        ))}
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

      {/* AI Insights Section */}
      <InsightsSection />
    </div>
  );
};
