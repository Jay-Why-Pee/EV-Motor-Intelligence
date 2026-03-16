
-- Fix search path for enforce_feedback_limit
CREATE OR REPLACE FUNCTION public.enforce_feedback_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
