
-- site_config table for storing site password
CREATE TABLE public.site_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Only service_role can access (password not exposed to client)
CREATE POLICY "Service role full access" ON public.site_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed initial password
INSERT INTO public.site_config (key, value) VALUES ('site_password', '라이프스굿');

-- Feedback FIFO trigger: keep only 777 rows
CREATE OR REPLACE FUNCTION public.enforce_feedback_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.feedback
  WHERE id IN (
    SELECT id FROM public.feedback
    ORDER BY created_at DESC
    OFFSET 777
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER feedback_limit_trigger
AFTER INSERT ON public.feedback
FOR EACH STATEMENT
EXECUTE FUNCTION public.enforce_feedback_limit();
