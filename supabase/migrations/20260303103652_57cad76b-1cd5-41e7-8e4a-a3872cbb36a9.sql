
-- Create market_analysis table to store AI-generated analysis data
CREATE TABLE public.market_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- 'charts', 'research', 'patents'
  content jsonb NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  news_analyzed_count integer NOT NULL DEFAULT 0,
  UNIQUE(type)
);

-- Enable RLS
ALTER TABLE public.market_analysis ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read market_analysis"
ON public.market_analysis
FOR SELECT
USING (true);
