import { cookies } from 'next/headers';
import { decode, type JWT } from 'next-auth/jwt';

/** Auth.js 세션 토큰 쿠키 기본 이름. HTTPS에서는 `__Secure-` 접두가 붙는다. */
const SESSION_COOKIE_BASE_NAME = 'authjs.session-token';

const SESSION_COOKIE_NAMES = [
  `__Secure-${SESSION_COOKIE_BASE_NAME}`,
  SESSION_COOKIE_BASE_NAME,
] as const;

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

/**
 * 세션 토큰 쿠키 값을 읽는다. 값이 길어 Auth.js가 `이름.0`, `이름.1`로 분할 저장한
 * 경우 순서대로 이어 붙인다.
 *
 * @param store 요청 쿠키 스토어
 * @param name 세션 쿠키 이름
 * @returns 이어 붙인 토큰 문자열, 쿠키가 없으면 null
 */
function readChunkedCookieValue(
  store: CookieReader,
  name: string,
): string | null {
  const direct = store.get(name)?.value;

  if (direct) {
    return direct;
  }

  let value = '';

  for (let index = 0; ; index += 1) {
    const chunk = store.get(`${name}.${index}`)?.value;

    if (chunk === undefined) {
      break;
    }

    value += chunk;
  }

  return value === '' ? null : value;
}

/**
 * 현재 요청의 Auth.js 세션 쿠키를 직접 복호화해 세션 클레임을 반환한다.
 *
 * Auth.js는 OAuth 콜백의 jwt 콜백에 기존 세션 토큰이 아니라 프로바이더 프로필로
 * 새로 만든 토큰을 넘기므로, 로그인 상태를 유지한 채 진행해야 하는 플로우(계정 연동)는
 * 이 함수로 기존 클레임을 복원해야 한다. salt는 Auth.js와 동일하게 쿠키 이름을 쓴다.
 *
 * @returns 복호화된 세션 클레임, 쿠키가 없거나 복호화에 실패하면 null
 */
export async function restoreSessionClaims(): Promise<JWT | null> {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return null;
  }

  const store = await cookies();

  for (const name of SESSION_COOKIE_NAMES) {
    const raw = readChunkedCookieValue(store, name);

    if (!raw) {
      continue;
    }

    try {
      return await decode({ token: raw, secret, salt: name });
    } catch {
      return null;
    }
  }

  return null;
}
