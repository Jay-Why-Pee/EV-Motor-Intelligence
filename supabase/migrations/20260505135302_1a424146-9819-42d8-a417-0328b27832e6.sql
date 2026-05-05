ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS link_verified boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS link_status integer,
  ADD COLUMN IF NOT EXISTS link_blocked_reason text,
  ADD COLUMN IF NOT EXISTS resolved_url text,
  ADD COLUMN IF NOT EXISTS link_verified_at timestamptz DEFAULT now();