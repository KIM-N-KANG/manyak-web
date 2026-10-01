import { getApp, getApps, initializeApp } from 'firebase/app';
// getToken·deleteToken은 SDK 12에서 FID(Firebase Installation ID) 기반 register/
// onRegistered로 대체가 권고돼 deprecated 표기가 붙었다. 그러나 서버와 Android는
// 등록 토큰으로 발송·저장하는 계약(§4-3-5 디바이스 푸시 토큰)이라 FID로 바꾸려면
// 서버 발송 대상과 토큰 테이블 계약이 함께 바뀌어야 한다. 그때까지 토큰 API를 쓴다.
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  type MessagePayload,
  type Messaging,
  onMessage,
} from 'firebase/messaging';

import {
  IS_PUSH_ENABLED,
  PUSH_FIREBASE_CONFIG,
  PUSH_SERVICE_WORKER_PATH,
  PUSH_VAPID_KEY,
} from './config';

let messagingPromise: Promise<Messaging | null> | null = null;

/**
 * FCM 서비스 워커를 등록한다. Firebase 설정은 SW가 `process.env`를 못 읽으므로
 * 등록 URL 쿼리스트링으로 넘긴다. 같은 URL 재등록은 브라우저가 멱등 처리한다.
 *
 * @returns 서비스 워커 등록
 */
function registerServiceWorker() {
  const params = new URLSearchParams(
    Object.entries(PUSH_FIREBASE_CONFIG).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );

  return navigator.serviceWorker.register(
    `${PUSH_SERVICE_WORKER_PATH}?${params.toString()}`,
    { scope: '/', updateViaCache: 'none' },
  );
}

/**
 * Firebase Messaging 인스턴스를 지연 초기화해 반환한다. 푸시가 비활성이거나
 * 브라우저가 지원하지 않으면 null이다. 한 번 만든 결과는 재사용한다.
 *
 * @returns Messaging 인스턴스 또는 null
 */
export function getPushMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined' || !IS_PUSH_ENABLED) {
    return Promise.resolve(null);
  }

  messagingPromise ??= isSupported().then((supported) => {
    if (!supported) {
      return null;
    }

    const app = getApps().length
      ? getApp()
      : initializeApp(PUSH_FIREBASE_CONFIG);

    return getMessaging(app);
  });

  return messagingPromise;
}

/**
 * 브라우저가 웹 푸시를 받을 수 있는지 판정한다. 푸시 활성·SDK 지원·Notification API
 * 존재를 모두 요구한다.
 *
 * @returns 지원하면 true
 */
export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  return (await getPushMessaging()) !== null;
}

/**
 * FCM 등록 토큰을 발급한다. 알림 권한이 `granted`가 아니면 SDK가 권한을 요청하므로
 * 호출부가 권한 상태를 먼저 확인해야 한다. 서비스 워커를 함께 등록한다.
 *
 * @returns 등록 토큰. 지원하지 않거나 발급에 실패하면 null
 */
export async function requestPushToken(): Promise<string | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  const messaging = await getPushMessaging();

  if (!messaging) {
    return null;
  }

  const serviceWorkerRegistration = await registerServiceWorker();

  if (!navigator.onLine) {
    return null;
  }

  return getToken(messaging, {
    vapidKey: PUSH_VAPID_KEY,
    serviceWorkerRegistration,
  });
}

/**
 * 현재 브라우저의 FCM 등록 토큰을 폐기한다. 서버의 토큰 삭제와 별개로, 다음 발급이
 * 새 토큰이 되게 한다. 실패는 삼킨다(로그아웃을 막지 않는다).
 */
export async function discardPushToken(): Promise<void> {
  const messaging = await getPushMessaging();

  if (!messaging) {
    return;
  }

  await deleteToken(messaging).catch(() => undefined);
}

/**
 * 페이지가 포그라운드일 때 도착하는 메시지를 구독한다. 백그라운드 메시지는 서비스
 * 워커와 브라우저가 표시하므로 여기로 오지 않는다.
 *
 * @param listener 메시지 수신 콜백
 * @returns 구독 해제 함수
 */
export async function subscribeForegroundMessages(
  listener: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getPushMessaging();

  if (!messaging) {
    return () => undefined;
  }

  return onMessage(messaging, listener);
}
