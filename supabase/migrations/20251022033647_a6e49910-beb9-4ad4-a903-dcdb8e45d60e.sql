-- Enable required extensions (safe if already enabled)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Deduplicate by URL before adding unique constraint
delete from public.news a
using public.news b
where a.ctid < b.ctid and a.url = b.url;

-- Add unique constraint on url if not exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'news_url_unique'
  ) then
    alter table public.news add constraint news_url_unique unique (url);
  end if;
end $$;

-- Add index on date for ordering/filtering (if not exists)
create index if not exists idx_news_date on public.news (date desc);

-- Drop existing cron jobs if any (swallow errors)
do $$
begin
  perform cron.unschedule('crawl-news-6am-kst');
exception when others then
  null;
end $$;

-- Schedule daily crawl at 06:00 KST (21:00 UTC)
select
  cron.schedule(
    'crawl-news-6am-kst',
    '0 21 * * *',
    $$
    select net.http_post(
      url := 'https://thmhwdwqbroimrrfalkt.supabase.co/functions/v1/crawl-news',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobWh3ZHdxYnJvaW1ycmZhbGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODA5MjQsImV4cCI6MjA3NTk1NjkyNH0.u4RUMHH2ZkXcsMhyjNWhB9TgTfVzaN8fFgh69kHTJds"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
    $$
  );