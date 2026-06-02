
CREATE TABLE public.patents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  summary text NOT NULL,
  applicant text,
  publication_number text,
  filing_date text,
  url text NOT NULL,
  source text NOT NULL DEFAULT 'Google Patents',
  keyword text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.patents TO anon;
GRANT SELECT ON public.patents TO authenticated;
GRANT ALL ON public.patents TO service_role;

ALTER TABLE public.patents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read patents" ON public.patents FOR SELECT USING (true);

CREATE TABLE public.research_papers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  summary text NOT NULL,
  authors text,
  venue text,
  published_date text,
  url text NOT NULL,
  source text NOT NULL DEFAULT 'Google Scholar',
  keyword text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.research_papers TO anon;
GRANT SELECT ON public.research_papers TO authenticated;
GRANT ALL ON public.research_papers TO service_role;

ALTER TABLE public.research_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read research_papers" ON public.research_papers FOR SELECT USING (true);

CREATE INDEX idx_patents_created_at ON public.patents(created_at DESC);
CREATE INDEX idx_research_papers_created_at ON public.research_papers(created_at DESC);
