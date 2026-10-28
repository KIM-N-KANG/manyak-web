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

/**
 * 문서 스크롤 위치를 1px에 붙잡아 인앱 브라우저의 당겨서 닫기 제스처가 앱 안쪽 스크롤을 가로채지 않게 한다.
 *
 * 앱은 프레임 안 컨테이너가 스크롤해 문서 위치가 늘 0이다. 인앱 브라우저는 WebView 문서 위치만 보므로
 * 목록을 내린 뒤 위로 스크롤해도 페이지 최상단에서 당긴 것으로 보고 브라우저를 끌어내린다.
 * 문서를 1px 더 길게 두고 위치를 1로 유지하면 최상단으로 보지 않는다. 0으로 내려갔을 때만 되돌려,
 * iOS가 입력 칸을 키보드 위로 올리려 문서를 더 내린 위치는 건드리지 않는다.
 *
 * @returns 여분 높이와 스크롤 리스너를 걷어 내는 해제 함수
 */
export function anchorDocumentScroll(): () => void {
  const { style } = document.body;
  const keepOffset = () => {
    if (window.scrollY < 1) window.scrollTo(0, 1);
  };

  style.paddingBottom = '1px';
  keepOffset();
  window.addEventListener('scroll', keepOffset, { passive: true });

  return () => {
    window.removeEventListener('scroll', keepOffset);
    style.removeProperty('padding-bottom');
  };
}
