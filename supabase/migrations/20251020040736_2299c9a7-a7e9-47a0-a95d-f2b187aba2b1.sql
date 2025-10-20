-- Fix crawl-news insertion failure due to strict category CHECK constraint
-- Drop the existing category check constraint to allow current categories
ALTER TABLE public.news DROP CONSTRAINT IF EXISTS news_category_check;

-- Optional: add an index to speed up filtering and ordering by category/date
CREATE INDEX IF NOT EXISTS idx_news_category_date ON public.news (category, date DESC);
