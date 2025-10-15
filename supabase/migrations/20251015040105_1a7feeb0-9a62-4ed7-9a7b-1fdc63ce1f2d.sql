-- Schedule daily news crawling at 6 AM KST (21:00 UTC previous day)
-- This will run the crawl-news function daily
SELECT cron.schedule(
  'daily-news-crawl',
  '0 21 * * *', -- 21:00 UTC = 6:00 AM KST
  $$
  SELECT
    net.http_post(
      url := 'https://thmhwdwqbroimrrfalkt.supabase.co/functions/v1/crawl-news',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobWh3ZHdxYnJvaW1ycmZhbGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODA5MjQsImV4cCI6MjA3NTk1NjkyNH0.u4RUMHH2ZkXcsMhyjNWhB9TgTfVzaN8fFgh69kHTJds"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule news analysis after crawling (30 minutes after crawl at 6:30 AM KST)
SELECT cron.schedule(
  'daily-news-analysis',
  '30 21 * * *', -- 21:30 UTC = 6:30 AM KST
  $$
  SELECT
    net.http_post(
      url := 'https://thmhwdwqbroimrrfalkt.supabase.co/functions/v1/analyze-news',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobWh3ZHdxYnJvaW1ycmZhbGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODA5MjQsImV4cCI6MjA3NTk1NjkyNH0.u4RUMHH2ZkXcsMhyjNWhB9TgTfVzaN8fFgh69kHTJds"}'::jsonb
    ) as request_id;
  $$
);