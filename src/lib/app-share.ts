import { APP_PATH } from '@/constants/app-path';
import {
  APP_OPEN_FALLBACK_DELAY_MS,
  buildAppIntentUrl,
  buildPlayStoreUrl,
  scheduleEscapeFallback,
} from '@/lib/app-banner';
import { openExternalBrowser } from '@/lib/external-browser-escape';
import { detectInAppBrowser } from '@/lib/in-app-browser';

/** 공유 링크로 들어온 설치의 귀속값이다. 배너 설치와 구분한다. */
const APP_SHARE_MARKET_REFERRER = encodeURIComponent(
  'utm_source=manyak_web&utm_medium=share_link',
);

/** 공유 링크 화면의 버튼과 자동 이동 폴백이 여는 플레이스토어 주소다. */
export const APP_SHARE_PLAY_STORE_URL = buildPlayStoreUrl(
  APP_SHARE_MARKET_REFERRER,
);

/** 이 탭에서 자동 이동을 이미 실행했는지 담는 sessionStorage 키다. */
export const APP_SHARE_REDIRECTED_KEY = 'manyak:app-share:redirected';

/**
 * 이 탭에서 자동 이동을 이미 실행했는지 읽고, 아니면 실행한 것으로 기록한다.
 * 앱에서 뒤로 돌아오거나 새로고침해도 다시 보내지 않기 위해서다.
 * 저장소를 쓸 수 없으면 처음으로 본다.
 *
 * @returns 이미 실행했으면 true
 */
function claimAppShareRedirect(): boolean {
  try {
    if (window.sessionStorage.getItem(APP_SHARE_REDIRECTED_KEY) === '1') {
      return true;
    }

    window.sessionStorage.setItem(APP_SHARE_REDIRECTED_KEY, '1');
  } catch {
    // 기록하지 못하면 이번 로드만 이동한다.
  }

  return false;
}

/**
 * 공유 링크 화면의 자동 이동을 탭마다 한 번 실행한다. Android는 intent 링크로 앱을 열고
 * 열리지 않으면 플레이스토어로 보낸다. 카카오톡 인앱은 그 전에 카카오 스킴으로 플레이스토어를
 * 외부 브라우저에 여는 단계를 거친다. 그 밖의 환경은 웹 홈으로 교체 이동해 뒤로가기가
 * 이 화면으로 돌아오지 않게 한다.
 *
 * @param userAgent 현재 브라우저의 User-Agent
 * @returns 예약한 폴백을 취소하는 함수. 이동하지 않았거나 폴백이 없으면 null
 */
export function startAppShareRedirect(userAgent: string): (() => void) | null {
  if (claimAppShareRedirect()) {
    return null;
  }

  if (!/Android/.test(userAgent)) {
    window.location.replace(APP_PATH.MAIN.STORIES);

    return null;
  }

  window.location.href = buildAppIntentUrl(
    APP_PATH.MAIN.STORIES,
    APP_SHARE_MARKET_REFERRER,
  );

  const goToPlayStore = () => window.location.replace(APP_SHARE_PLAY_STORE_URL);
  let cancel = scheduleEscapeFallback(() => {
    if (detectInAppBrowser(userAgent) !== 'kakaotalk') {
      goToPlayStore();

      return;
    }

    openExternalBrowser(APP_SHARE_PLAY_STORE_URL, 'kakaotalk');
    cancel = scheduleEscapeFallback(goToPlayStore, APP_OPEN_FALLBACK_DELAY_MS);
  }, APP_OPEN_FALLBACK_DELAY_MS);

  return () => cancel();
}
