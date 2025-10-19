-- Update news table category to support new categories (already text, so this is safe)
ALTER TABLE public.news ALTER COLUMN category TYPE text;

-- Schedule crawl-news to run daily at 6 AM KST (21:00 UTC previous day, as KST is UTC+9)
SELECT cron.schedule(
  'crawl-news-daily-6am',
  '0 21 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://thmhwdwqbroimrrfalkt.supabase.co/functions/v1/crawl-news',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobWh3ZHdxYnJvaW1ycmZhbGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODA5MjQsImV4cCI6MjA3NTk1NjkyNH0.u4RUMHH2ZkXcsMhyjNWhB9TgTfVzaN8fFgh69kHTJds"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Schedule analyze-news to run 5 minutes after crawl (6:05 AM KST = 21:05 UTC)
SELECT cron.schedule(
  'analyze-news-daily-605am',
  '5 21 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://thmhwdwqbroimrrfalkt.supabase.co/functions/v1/analyze-news',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobWh3ZHdxYnJvaW1ycmZhbGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODA5MjQsImV4cCI6MjA3NTk1NjkyNH0.u4RUMHH2ZkXcsMhyjNWhB9TgTfVzaN8fFgh69kHTJds"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);