/** E2E에서 앱 안내 배너 변형을 고르기 위해 쓰는 대표 User-Agent다. */
export const USER_AGENT = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.54 Mobile Safari/537.36',
  androidKakao:
    'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36;KAKAOTALK 2610420',
  iosSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  iosKakao:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0',
  // 알려진 앱 토큰도 Safari 토큰도 없는 iOS 인앱 브라우저다.
  iosUnknownApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  // 터치 기기 에뮬레이션에서 Mac UA는 iPadOS로 판정되므로 Windows UA를 쓴다.
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
} as const;
