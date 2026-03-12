
CREATE TABLE public.briefing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.briefing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read briefing_history"
  ON public.briefing_history
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert briefing_history"
  ON public.briefing_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can delete briefing_history"
  ON public.briefing_history
  FOR DELETE
  TO service_role
  USING (true);
