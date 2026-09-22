/**
 * Firebase 웹 앱 설정. 서버·Android와 같은 Firebase 프로젝트의 웹 앱이며 값은 모두
 * 공개값이다(Android의 google-services.json과 같은 성격). 서비스 워커에도 같은
 * 값을 등록 URL 쿼리스트링으로 넘긴다.
 */
export const PUSH_FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Firebase 콘솔 > 클라우드 메시징 > 웹 푸시 인증서의 공개 키. */
export const PUSH_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** 브라우저에 등록하는 FCM 서비스 워커 경로. `public/`의 정적 파일이다. */
export const PUSH_SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';

/**
 * 웹 푸시 활성화 여부를 판정한다. 설정값이 하나라도 비면 비활성이다. 분석·픽셀과
 * 달리 production 게이팅은 두지 않는다 — localhost는 보안 컨텍스트라 로컬 dev에서도
 * 실제 수신을 확인해야 하기 때문이다. CI E2E·Preview는 env를 비워 끈다.
 *
 * @param input Firebase 웹 설정과 VAPID 키
 * @returns 모든 값이 있으면 true
 */
export function resolvePushEnabled(input: {
  config: Record<string, string | undefined>;
  vapidKey?: string;
}): boolean {
  return (
    Object.values(input.config).every((value) => Boolean(value)) &&
    Boolean(input.vapidKey)
  );
}

/** 현재 빌드에서 웹 푸시가 활성화됐는지 여부. */
export const IS_PUSH_ENABLED = resolvePushEnabled({
  config: PUSH_FIREBASE_CONFIG,
  vapidKey: PUSH_VAPID_KEY,
});
