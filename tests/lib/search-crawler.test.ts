import { describe, expect, it } from 'vitest';

import { isSearchCrawler } from '@/lib/search-crawler';

/** 주요 검색 크롤러의 실제 User-Agent 문자열이다. */
const CRAWLER_USER_AGENTS = {
  googlebot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/125.0.6422.175 Safari/537.36',
  bingbot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  yeti: 'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',
  daumoa:
    'Mozilla/5.0 (compatible; Daumoa/4.0; +http://cs.daum.net/faq/15/4118.html)',
  applebot:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko; compatible; Applebot/0.1; +http://www.apple.com/go/applebot)',
  duckduckbot: 'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
} as const;

/** 링크 미리보기 스크래퍼의 실제 User-Agent 문자열이다. */
const SCRAPER_USER_AGENTS = {
  kakaotalkScrap:
    'facebookexternalhit/1.1; kakaotalk-scrap/1.0; +https://devtalk.kakao.com/t/scrap/33984',
  facebook:
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  twitter: 'Twitterbot/1.0',
  slack: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  discord: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
} as const;

/**
 * 실사용자 인앱브라우저·일반 브라우저의 User-Agent 문자열이다.
 * 이들이 크롤러로 오탐되면 해당 사용자가 온보딩을 보지 못한다.
 */
const HUMAN_USER_AGENTS = {
  daumApp:
    'Mozilla/5.0 (Linux; Android 13; SM-S908N Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.0.0 Mobile Safari/537.36 DaumApps/9.5.5 DaumDevice/mobile',
  kakaoTalkInApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0',
  naverApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.1.5; 15PRO)',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
} as const;

describe('isSearchCrawler', () => {
  it.each(Object.entries(CRAWLER_USER_AGENTS))(
    'matches the %s search crawler',
    (_name, userAgent) => {
      expect(isSearchCrawler(userAgent)).toBe(true);
    },
  );

  it.each(Object.entries(SCRAPER_USER_AGENTS))(
    'matches the %s link scraper',
    (_name, userAgent) => {
      expect(isSearchCrawler(userAgent)).toBe(true);
    },
  );

  it.each(Object.entries(HUMAN_USER_AGENTS))(
    'does not match the %s human browser',
    (_name, userAgent) => {
      expect(isSearchCrawler(userAgent)).toBe(false);
    },
  );

  it('returns false for a missing user agent', () => {
    expect(isSearchCrawler(null)).toBe(false);
    expect(isSearchCrawler('')).toBe(false);
  });
});
