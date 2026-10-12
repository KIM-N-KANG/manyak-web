export type InAppBrowser = 'kakaotalk' | 'instagram' | 'threads';

/**
 * 인앱 브라우저 UA 감지.
 * - 카카오톡: iOS/Android 모두 UA에 'KAKAOTALK' 토큰 포함
 * - 인스타그램: UA에 'Instagram' 토큰 포함
 * - 쓰레드: UA에 'Barcelona'(쓰레드 앱 코드네임) 토큰 포함
 *
 * @param userAgent 검사할 User-Agent 문자열
 * @returns 감지된 인앱 브라우저 종류, 없으면 null
 */
export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  if (/KAKAOTALK/i.test(userAgent)) {
    return 'kakaotalk';
  }

  if (/Instagram/i.test(userAgent)) {
    return 'instagram';
  }

  if (/Barcelona/i.test(userAgent)) {
    return 'threads';
  }

  return null;
}

/**
 * 앱 안내 배너가 인앱 브라우저로 보는 UA 토큰이다. `detectInAppBrowser`보다 넓게 잡고,
 * Android의 `; wv)`는 앱 안 WebView의 공통 표식이다.
 */
const IN_APP_BROWSER_PATTERN =
  /KAKAOTALK|Instagram|Barcelona|FBAN|FBAV|FB_IAB|Line\/|NAVER\(inapp|DaumApps|BAND\/|; wv\)/;

/**
 * 앱 안 브라우저(인앱 브라우저, WebView)인지 판정한다. 분석 이벤트 값이 걸린
 * `detectInAppBrowser`와 달리 앱 종류를 구분하지 않는다.
 *
 * @param userAgent 검사할 User-Agent 문자열
 * @returns 인앱 브라우저면 true
 */
export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP_BROWSER_PATTERN.test(userAgent);
}
