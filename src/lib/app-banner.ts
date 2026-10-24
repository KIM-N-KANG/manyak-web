import { APP_PATH } from '@/constants/app-path';
import { isIosDevice } from '@/lib/device';
import { isInAppBrowser } from '@/lib/in-app-browser';
import { isSearchCrawler } from '@/lib/search-crawler';

/** 앱 안내 배너의 노출 변형이다. 분석 이벤트 `variant` 값과 같다. */
export type AppBannerVariant =
  | 'android_inapp'
  | 'android_browser'
  | 'ios_inapp'
  | 'ios_browser';

type AppBannerInput = {
  userAgent: string;
  maxTouchPoints: number;
  isStandalone: boolean;
  pathname: string;
};

/** 누적 접속 수를 담는 localStorage 키다. */
export const APP_BANNER_VISITS_KEY = 'manyak:app-banner:visits';

/** 이번 탭의 접속 회차를 담는 sessionStorage 키다. 값이 있으면 다시 세지 않는다. */
export const APP_BANNER_SESSION_KEY = 'manyak:app-banner:session';

/** 이번 접속에서 배너를 닫았는지 담는 sessionStorage 키다. */
export const APP_BANNER_DISMISSED_KEY = 'manyak:app-banner:dismissed';

/**
 * Android 앱이 받는 전용 스킴 링크의 스킴과 호스트다. 웹 배포 환경과 관계없이 앱 intent-filter와 같아야 한다.
 * https 대신 전용 스킴을 쓰는 이유는 검증되지 않은 https 필터가 Android 11 이하에서 다른 앱의
 * manyak.app 링크마다 앱 선택창을 띄우기 때문이다.
 */
const ANDROID_APP_SCHEME = 'manyak';

const ANDROID_APP_HOST = 'manyak.app';

const ANDROID_APP_PACKAGE = 'app.manyak';

/** 앱이 없을 때 Chrome이 플레이스토어에 넘기는 설치 귀속값이다. */
const ANDROID_MARKET_REFERRER = encodeURIComponent(
  'utm_source=manyak_web&utm_medium=app_banner',
);

/**
 * 앱 열기를 시도한 뒤 실패로 판단하기까지 기다리는 시간(ms)이다. 실패하면 사용자가
 * 플레이스토어를 기다리는 시간이라 짧게 둔다. 앱이 이보다 늦게 뜨면 플레이스토어가 함께 열린다.
 */
export const APP_OPEN_FALLBACK_DELAY_MS = 700;

/**
 * 앱 열기가 일어나지 않을 때 직접 여는 플레이스토어 주소를 만든다. 인스타그램 인앱 브라우저는
 * 앱이 없으면 intent 링크를 `S.browser_fallback_url`까지 무시하고 버리지만 이 주소는 연다.
 *
 * @param referrer 인코딩된 설치 귀속값
 * @returns 플레이스토어 https 주소
 */
export function buildPlayStoreUrl(referrer: string): string {
  return `https://play.google.com/store/apps/details?id=${ANDROID_APP_PACKAGE}&referrer=${referrer}`;
}

/** 배너의 앱 열기가 실패했을 때 여는 플레이스토어 주소다. */
export const ANDROID_PLAY_STORE_URL = buildPlayStoreUrl(
  ANDROID_MARKET_REFERRER,
);

/**
 * 배너를 띄우지 않는 경로다. 문서 화면은 Android 앱 WebView가 열어 앱 안에서 앱 열기를
 * 권하지 않도록 뺀다.
 */
const EXCLUDED_PATHS: readonly string[] = [
  APP_PATH.ABOUT,
  APP_PATH.TERMS,
  APP_PATH.PRIVACY,
  APP_PATH.APP,
];

/** iOS의 Safari, Chrome 외 브라우저다. 홈 화면 추가 안내가 맞지 않아 뺀다. */
const IOS_OTHER_BROWSER_PATTERN = /(FxiOS|EdgiOS|Whale|OPiOS|GSA)\//;

const STORY_DETAIL_PATH_PATTERN = /^\/stories\/([^/]+)$/;

/**
 * 브라우저와 경로로 배너 변형을 정한다. 접속 빈도는 보지 않는다.
 * iOS는 알려진 인앱 토큰이 있거나 `Safari/` 토큰이 없으면 인앱으로 본다.
 *
 * @param input UA, 터치 포인트 수, 홈 화면 설치본 여부, 현재 경로
 * @returns 배너 변형, 띄우지 않으면 null
 */
export function resolveAppBannerVariant({
  userAgent,
  maxTouchPoints,
  isStandalone,
  pathname,
}: AppBannerInput): AppBannerVariant | null {
  if (
    isStandalone ||
    isSearchCrawler(userAgent) ||
    EXCLUDED_PATHS.includes(pathname)
  ) {
    return null;
  }

  if (isIosDevice(userAgent, maxTouchPoints)) {
    if (isInAppBrowser(userAgent) || !userAgent.includes('Safari/')) {
      return 'ios_inapp';
    }

    return IOS_OTHER_BROWSER_PATTERN.test(userAgent) ? null : 'ios_browser';
  }

  if (/Android/.test(userAgent)) {
    return isInAppBrowser(userAgent) ? 'android_inapp' : 'android_browser';
  }

  return null;
}

/**
 * 홈 화면 추가를 스크린샷 4단계로 안내할 수 있는지 판정한다. 스크린샷은 iPhone의
 * Safari 26 화면이라 iPad, iOS Chrome, 이전 Safari는 텍스트 안내를 쓴다. Safari 26은
 * UA의 OS 버전을 고정하므로 `Version/`의 주 버전으로 판정한다.
 *
 * @param userAgent 판정할 User-Agent
 * @returns 스크린샷 안내를 쓰면 true
 */
export function supportsHomeScreenImageGuide(userAgent: string): boolean {
  return (
    /iPhone/.test(userAgent) &&
    Number(/Version\/(\d+)/.exec(userAgent)?.[1] ?? 0) >= 26
  );
}

/**
 * Android 앱 열기 버튼을 쓰는 변형인지 판정한다.
 *
 * @param variant 배너 변형
 * @returns Android 변형이면 true
 */
export function isAndroidVariant(variant: AppBannerVariant): boolean {
  return variant === 'android_inapp' || variant === 'android_browser';
}

/**
 * 접속 회차와 닫기 여부로 배너를 보일지 정한다. 인앱은 매 접속, 자체 브라우저는
 * 첫 번째와 세 번째 접속에만 보인다.
 *
 * @param variant 배너 변형
 * @param visitNumber 이번 탭의 접속 회차(1부터)
 * @param isDismissed 이번 접속에서 닫았는지
 * @returns 보이면 true
 */
export function shouldShowAppBanner(
  variant: AppBannerVariant,
  visitNumber: number,
  isDismissed: boolean,
): boolean {
  if (isDismissed) {
    return false;
  }

  if (variant === 'android_inapp' || variant === 'ios_inapp') {
    return true;
  }

  return visitNumber === 1 || visitNumber === 3;
}

/**
 * 스토리 상세 경로에서 스토리 ID를 읽는다. 하위 경로와 구 제작 경로는 상세가 아니다.
 *
 * @param pathname 현재 경로
 * @returns 스토리 ID, 상세가 아니면 null
 */
export function parseStoryDetailId(pathname: string): string | null {
  if (pathname === APP_PATH.LEGACY.NEW_STORY) {
    return null;
  }

  return STORY_DETAIL_PATH_PATTERN.exec(pathname)?.[1] ?? null;
}

/**
 * Android 앱을 여는 intent 링크를 만든다. 패키지를 명시해 앱이 없으면 브라우저가
 * 플레이스토어를 연다. 스토리 상세에서는 앱의 그 스토리를, 그 밖에는 앱 홈을 연다.
 *
 * @param pathname 현재 경로
 * @param referrer 인코딩된 설치 귀속값. 기본은 배너 값
 * @returns intent:// 링크
 */
export function buildAppIntentUrl(
  pathname: string,
  referrer: string = ANDROID_MARKET_REFERRER,
): string {
  const storyId = parseStoryDetailId(pathname);
  const path =
    storyId === null ? APP_PATH.MAIN.STORIES : APP_PATH.STORY_DETAIL(storyId);

  return `intent://${ANDROID_APP_HOST}${path}#Intent;scheme=${ANDROID_APP_SCHEME};package=${ANDROID_APP_PACKAGE};S.market_referrer=${referrer};end`;
}

/**
 * 외부 브라우저나 앱 전환을 시도한 뒤 대기 시간 안에 문서가 한 번도 숨겨지지 않으면 실패로
 * 보고 콜백을 부른다. 전환에 성공하면 앱이 백그라운드로 가며 문서가 숨겨지므로, 그 뒤 대기 시간
 * 안에 돌아와도 실패로 보지 않는다.
 *
 * @param onFail 전환에 실패했을 때 부를 함수
 * @param delayMs 실패로 판단하기까지 기다리는 시간(ms)
 * @returns 대기를 취소하는 함수
 */
export function scheduleEscapeFallback(
  onFail: () => void,
  delayMs: number,
): () => void {
  let timer = 0;

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      cancel();
    }
  }

  function cancel() {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  timer = window.setTimeout(() => {
    cancel();
    onFail();
  }, delayMs);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return cancel;
}

/**
 * 저장된 값을 양의 정수로 읽는다.
 *
 * @param value 저장된 문자열
 * @returns 양의 정수면 그 값, 아니면 null
 */
function parsePositiveInteger(value: string | null): number | null {
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : null;
}

/**
 * 이번 탭의 접속 회차를 돌려준다. 탭에서 처음 부르면 누적 접속 수를 1 올려 기록하고,
 * 같은 탭에서는 기록한 회차를 그대로 돌려준다. 저장소를 쓸 수 없으면 첫 접속으로 본다.
 *
 * @returns 이번 탭의 접속 회차(1부터)
 */
export function recordSessionVisit(): number {
  try {
    const current = parsePositiveInteger(
      window.sessionStorage.getItem(APP_BANNER_SESSION_KEY),
    );

    if (current !== null) {
      return current;
    }

    const next =
      (parsePositiveInteger(
        window.localStorage.getItem(APP_BANNER_VISITS_KEY),
      ) ?? 0) + 1;

    window.localStorage.setItem(APP_BANNER_VISITS_KEY, String(next));
    window.sessionStorage.setItem(APP_BANNER_SESSION_KEY, String(next));

    return next;
  } catch {
    return 1;
  }
}

/**
 * 이번 접속에서 배너를 닫았는지 읽는다. 저장소를 쓸 수 없으면 닫지 않은 것으로 본다.
 *
 * @returns 닫았으면 true
 */
export function isAppBannerDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(APP_BANNER_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** 이번 접속 동안 배너를 닫은 것으로 기록한다. 저장소를 쓸 수 없으면 기록하지 않는다. */
export function dismissAppBanner(): void {
  try {
    window.sessionStorage.setItem(APP_BANNER_DISMISSED_KEY, '1');
  } catch {
    // 저장하지 못해도 화면의 닫힘 상태로 이번 렌더에서는 숨긴다.
  }
}
