
CREATE TABLE public.visit_counter (
  id integer PRIMARY KEY DEFAULT 1,
  count bigint NOT NULL DEFAULT 0
);

ALTER TABLE public.visit_counter ENABLE ROW LEVEL SECURITY;

INSERT INTO public.visit_counter (id, count) VALUES (1, 0);

CREATE POLICY "Anyone can read visit_counter" ON public.visit_counter
  FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can update visit_counter" ON public.visit_counter
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.increment_visit_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.visit_counter SET count = count + 1 WHERE id = 1 RETURNING count;
$$;
