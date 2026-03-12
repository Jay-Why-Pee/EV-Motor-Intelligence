CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  mood int NOT NULL DEFAULT 3,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feedback"
  ON public.feedback FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert feedback"
  ON public.feedback FOR INSERT TO public WITH CHECK (true);