DELETE FROM public.news
WHERE url ~* '://(www\.)?(news\.)?(google|bing|yahoo|duckduckgo|baidu|yandex)\.';

ALTER TABLE public.news
  DROP CONSTRAINT IF EXISTS news_url_no_wrapper_host;

ALTER TABLE public.news
  ADD CONSTRAINT news_url_no_wrapper_host
  CHECK (url !~* '://(www\.)?(news\.)?(google|bing|yahoo|duckduckgo|baidu|yandex)\.');