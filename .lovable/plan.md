# Motor Manufacturer 뉴스 누락: 원인 분석 및 근본 개선

## 원인 분석 (데이터로 확인됨)

DB 현재 상태:
- **뉴스 출처 5개뿐**: CleanTechnica(175), Electrek(160), Automotive World(108), InsideEVs(101), Power Electronics News(29)
- `GN:` 접두사 소스가 **0건** — 즉 `crawl-news`에 등록된 **주요사 타겟 Google News RSS 피드 30+개가 단 한 건도 저장되지 않고 있음**
- 제목에 부품사명이 포함된 기사는 전체 500+건 중 단 2건

### 근본 원인 3가지

**1. Google News RSS 래퍼 URL이 검증 단계에서 100% 폐기됨**
`crawl-news/index.ts`의 `validateAndFixUrl`은 `news.google.com` 호스트를 래퍼로 판정하고, `fetch(원본)` 후 `res.url`이 여전히 `news.google.com`이면 버립니다. Google News RSS 링크(`/rss/articles/CBMi...`)는 서버측 리다이렉트가 아닌 **JS 인터스티셜**을 반환하므로 `res.url`이 그대로 남아 전부 폐기됩니다. → 주요사 시드 피드가 사실상 무효.

**2. 일반 피드에는 Tier-1 부품사 언급이 원래 적음**
5개 일반 EV 피드는 OEM/완성차 뉴스 위주라 Bosch/ZF/Schaeffler 같은 공급사가 제목에 노출되는 비율이 매우 낮음. AI가 요약만 보고 유추하기 어려움.

**3. 분류기가 짧은 요약만으로 판단해 부품사 언급을 놓침**
`classifyAndTranslate`는 title+summary(220자)만 AI에 넣음. 본문을 안 봐서 "supplied by ZF" 같은 문장이 요약에 안 잡히면 태깅 실패.

## 개선안

### A. Google News 래퍼 URL 실제 URL로 복원
Google News RSS의 `<link>`는 `https://news.google.com/rss/articles/<base64>`. base64 부분에 실제 publisher URL이 인코딩되어 있음. 디코더 추가:
```
CBMi<base64url> → decode → 실제 URL 추출 (protobuf 프리픽스 스킵)
```
디코딩 실패 시 → RSS `<source url="...">` 태그 또는 description에서 첫 http URL 추출 fallback.
이렇게 얻은 실제 publisher URL로 정상 검증 → 저장. 이걸로 30+개 주요사 시드 피드가 살아납니다.

### B. 결정론적 사전 태깅(Rule-based) 도입
AI 호출 **전에** title+summary+최종URL 호스트에 대해 회사명 정규식 스캔:
- `\b(Bosch|ZF Friedrichshafen|ZF Group|Schaeffler|Denso|Magna International|Hyundai Mobis|AISIN|BorgWarner|Hitachi Astemo|Nidec|Vitesco|Valeo|LG Magna)\b`
- 매치되면 해당 카테고리를 **강제 태깅** (AI가 못 붙여도 확정).
- AI는 추가 태그만 붙임 (region, 다른 회사).
- URL 호스트에 `bosch.com`, `zf.com`, `schaeffler.com` 등이면 자체 발신 자료로 강제 태깅.

이러면 일반 피드의 본문 언급도 놓치지 않음.

### C. 부품사 자체 프레스룸 RSS 직접 추가
가장 신뢰도 높은 방법. Google News 우회 없이 원본 확보:
- Bosch: `https://www.bosch-presse.de/pressportal/de/en/rss.xml`
- ZF: `https://press.zf.com/press/en/rss.xml`
- Schaeffler: `https://www.schaeffler.com/remotemedien/media/rss/press_en.xml`
- BorgWarner Investor: `https://www.borgwarner.com/rss/news`
- Magna: `https://www.magna.com/rss/news`
- Valeo: `https://www.valeo.com/en/feed/`
- Nidec IR: `https://www.nidec.com/en/rss/news.xml`
등 접근 가능한 것부터 등록(피드 없는 곳은 GN 대체).

### D. 클래시파이어 프롬프트 정비
- 사전 태그(rule)로 이미 붙은 카테고리는 프롬프트에 "이미 확정됨"으로 전달, AI는 **삭제 금지 · 추가만** 하도록 지시.
- Tier-1 supplier 언급 우선 규칙 강조.

### E. 기존 500+건 재분류
새 룰 기반 태거를 기존 news 전체에 1회 실행하여 잘못 "Other" 처리된 부품사 기사 복구.

## 구현 항목
1. `supabase/functions/crawl-news/index.ts`
   - `decodeGoogleNewsUrl(url)` 헬퍼 추가 (base64 protobuf 파싱 + description fallback)
   - `parseRssItems`에서 `news.google.com` 링크는 즉시 디코드 → 실제 URL로 교체
   - `applyRuleTags(article)` 헬퍼 추가 (회사명 regex + 도메인 매칭)
   - `classifyAndTranslate`에서 rule 태그를 seed로 넘기고 AI는 union만
   - 부품사 프레스룸 RSS를 `feeds` 배열에 추가
2. `supabase/functions/reclassify-news/index.ts` **신규**
   - DB 전체 순회하며 rule 태거 + 필요 시 AI 재분류 → 카테고리 업데이트
3. 개선 후 크롤/재분류 실행 → 카테고리별 카운트 재확인

## 기술 세부(참고)
Google News base64 디코드 예시(Deno):
```ts
function decodeGN(url: string): string | null {
  const m = url.match(/\/rss\/articles\/([^?/]+)/);
  if (!m) return null;
  try {
    const bin = atob(m[1].replace(/-/g,'+').replace(/_/g,'/'));
    const httpIdx = bin.indexOf('http');
    if (httpIdx < 0) return null;
    // 뒤에 non-printable 나오기 전까지가 URL
    let end = httpIdx;
    while (end < bin.length && bin.charCodeAt(end) >= 32 && bin.charCodeAt(end) < 127) end++;
    return bin.slice(httpIdx, end);
  } catch { return null; }
}
```
디코드 실패 케이스는 RSS `<source url>` / description 첫 URL로 폴백, 그것도 실패하면 원본 GN URL 그대로 fetch(리다이렉트 최대 5회) 시도 후에도 wrapper면 폐기.
