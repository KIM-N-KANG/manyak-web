/**
 * 세션 만료(리프레시 확정 거절) 신호를 fetch 레이어(비-React)에서 React 감시
 * 컴포넌트로 전달하는 초경량 pub/sub. 헤더 상수는 서버(프록시 라우트)와
 * 클라이언트(custom-fetch) 양쪽이 공유한다.
 */

/** 프록시가 세션 만료를 알릴 때 응답에 붙이는 헤더 이름. */
export const SESSION_EXPIRED_HEADER = 'x-manyak-session-expired';

/** 능동 로그아웃으로 로그인 페이지에 도착했음을 알리는 쿼리 파라미터 키(만료 안내 토스트용). */
export const SESSION_EXPIRED_PARAM = 'expired';

type Listener = () => void;

const listeners = new Set<Listener>();

/** 세션 만료를 구독자 전원에게 알린다(custom-fetch가 만료 헤더 감지 시 호출). */
export function notifySessionExpired(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** 응답 헤더에 세션 만료 신호가 있으면 구독자에게 알린다(브라우저 fetch 레이어용). */
export function notifyIfSessionExpired(headers: Headers): void {
  if (headers.get(SESSION_EXPIRED_HEADER) === '1') {
    notifySessionExpired();
  }
}

/** 세션 만료 신호를 구독한다. 반환된 함수로 해제한다. */
export function subscribeSessionExpired(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
