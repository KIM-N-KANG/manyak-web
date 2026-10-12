/**
 * 홈 화면 설치본(standalone)으로 열렸는지 판정한다. iOS는 설치본에서만 웹 푸시를
 * 받을 수 있어 권한 요청 대신 설치 안내를 보여줄지 정하는 데 쓰고, 앱 안내 배너는
 * 설치본에서 숨기는 데 쓴다.
 *
 * @returns 설치본이면 true
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari 전용 속성. 표준 display-mode가 잡히지 않는 구버전 대비.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * iOS 기기인지 판정한다. iPadOS 13+는 데스크톱 UA를 쓰므로 터치 포인트로 보정한다.
 *
 * @param userAgent 판정할 User-Agent. 생략하면 현재 브라우저 값
 * @param maxTouchPoints 판정할 터치 포인트 수. 생략하면 현재 브라우저 값
 * @returns iOS면 true
 */
export function isIosDevice(
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints = typeof navigator === 'undefined'
    ? 0
    : navigator.maxTouchPoints,
): boolean {
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  );
}
