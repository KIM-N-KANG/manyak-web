/**
 * 온보딩 게이트를 우회시킬 검색 크롤러·링크 스크래퍼의 User-Agent 키워드 목록.
 *
 * 실사용자 인앱브라우저 UA와 겹치지 않도록 정확한 토큰만 쓴다:
 * - 다음 앱 인앱브라우저가 `DaumApps`이므로 `daum`이 아닌 검색봇 토큰 `daumoa`를 쓴다.
 * - 카카오톡 인앱브라우저가 `KAKAOTALK`이므로 하이픈이 포함된 `kakaotalk-scrap`만 매치한다.
 * - 네이버 앱은 `NAVER(inapp; ...)`이고 검색봇은 `yeti`라 겹치지 않는다.
 *
 * 링크 미리보기 스크래퍼(카카오톡·페이스북 등)도 포함한다. 공유된 홈 URL이
 * 온보딩 리다이렉트로 해석되지 않고 홈 메타데이터로 미리보기가 그려지게 한다.
 *
 * AI/LLM 크롤러(GPTBot 등)는 수집 허용 정책이 별도 결정 사안이라 제외한다.
 */
const SEARCH_CRAWLER_UA_KEYWORDS = [
  'googlebot',
  'bingbot',
  'yeti',
  'daumoa',
  'applebot',
  'duckduckbot',
  'kakaotalk-scrap',
  'facebookexternalhit',
  'twitterbot',
  'slackbot',
  'discordbot',
] as const;

/**
 * User-Agent가 검색 크롤러 또는 링크 미리보기 스크래퍼인지 판별한다.
 *
 * @param userAgent 요청의 User-Agent 헤더 값
 * @returns 크롤러·스크래퍼이면 true
 */
export function isSearchCrawler(userAgent: string | null): boolean {
  if (!userAgent) {
    return false;
  }

  const normalized = userAgent.toLowerCase();

  return SEARCH_CRAWLER_UA_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
}
