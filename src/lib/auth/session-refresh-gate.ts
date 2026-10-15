import { FetchError } from '@/lib/api-error';

import {
  notifyIfSessionExpired,
  SESSION_EXPIRED_HEADER,
} from './session-expiry';
import {
  EXPIRES_AT_COOKIE,
  parseExpiresAt,
  SESSION_REFRESH_GATE_SKEW_MS,
  shouldRefreshAccessToken,
} from './token-cookie-policy';

/** 브라우저 재발급 게이트가 부르는 BFF 라우트. */
export const SESSION_REFRESH_ENDPOINT = '/api/auth/session-refresh';

type SessionRefreshGateDeps = {
  /** access 만료 시각(ms epoch). 회원 쿠키가 없으면 null이다 */
  readExpiresAt: () => number | null;
  /** 재발급을 한 번 수행한다. 세션 만료면 FetchError로 거절한다 */
  refresh: () => Promise<void>;
  now: () => number;
};

/**
 * 프록시 요청 전에 기다릴 재발급 게이트를 만든다. 만료가 임박하면 재발급을 한 번만 보내고,
 * 그동안 들어온 요청은 같은 결과를 기다린다. 화면이 열릴 때 몰린 요청이 각자 다른 BFF
 * 인스턴스에서 같은 refresh 토큰을 회전시키지 않게 한다.
 *
 * 한 만료 시각에는 한 번만 시도한다. 기기 시계가 앞서 서버가 아직 이르다고 보거나 일시
 * 실패해도 같은 값으로 다시 부르지 않고, 프록시의 선제 재발급에 맡긴다.
 *
 * @param deps 만료 시각 읽기, 재발급 수행, 현재 시각
 * @returns 요청 전에 기다릴 Promise를 돌려주는 함수
 */
export function createSessionRefreshGate({
  readExpiresAt,
  refresh,
  now,
}: SessionRefreshGateDeps): () => Promise<void> {
  let pending: Promise<void> | null = null;
  let attemptedExpiresAt: number | null = null;

  return () => {
    if (pending) return pending;

    const expiresAt = readExpiresAt();

    if (
      expiresAt === null ||
      expiresAt === attemptedExpiresAt ||
      !shouldRefreshAccessToken(expiresAt, now(), SESSION_REFRESH_GATE_SKEW_MS)
    ) {
      return Promise.resolve();
    }

    attemptedExpiresAt = expiresAt;
    pending = refresh().finally(() => {
      pending = null;
    });

    return pending;
  };
}

/**
 * 브라우저 쿠키에서 access 만료 시각을 읽는다.
 *
 * @returns 만료 시각(ms epoch), 없거나 손상이면 null
 */
function readExpiresAtCookie(): number | null {
  const prefix = `${EXPIRES_AT_COOKIE}=`;
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);

  return parseExpiresAt(value);
}

/**
 * BFF 재발급 라우트를 부른다. 네트워크 오류는 삼켜 기다리던 요청이 그대로 나가게 하고,
 * 세션 만료면 능동 로그아웃을 알린 뒤 거절해 기다리던 요청이 게스트로 나가지 않게 한다.
 *
 * @throws 세션이 만료됐으면 401 FetchError
 */
async function postSessionRefresh(): Promise<void> {
  let response: Response;

  try {
    response = await fetch(SESSION_REFRESH_ENDPOINT, {
      method: 'POST',
      cache: 'no-store',
    });
  } catch {
    return;
  }

  notifyIfSessionExpired(response.headers);

  if (response.headers.get(SESSION_EXPIRED_HEADER) === '1') {
    throw new FetchError('세션이 만료되었습니다.', 401, null);
  }
}

/** 브라우저의 프록시 요청 직전에 기다린다. 서버 렌더링에서는 바로 끝난다. */
export const waitForFreshSession: () => Promise<void> =
  typeof document === 'undefined'
    ? () => Promise.resolve()
    : createSessionRefreshGate({
        readExpiresAt: readExpiresAtCookie,
        refresh: postSessionRefresh,
        now: Date.now,
      });
