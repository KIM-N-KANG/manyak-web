import { cookies } from 'next/headers';

/** 외부 랜딩이 심고 로그인 콜백이 읽는 로그인 핸드오프 코드 쿠키 이름. */
export const HANDOFF_COOKIE_NAME = 'manyak_login_handoff';

/** 핸드오프 쿠키 수명(초). 백엔드 핸드오프 TTL 30분과 맞춘다(스펙 §4-3-5). */
export const HANDOFF_COOKIE_MAX_AGE_SECONDS = 30 * 60;

/**
 * 서버(BFF)에서 요청 쿠키의 핸드오프 코드를 읽는다.
 * 코드는 비밀값이므로 로그·분석에 남기지 않는다.
 *
 * @returns 핸드오프 코드 원문(없으면 undefined)
 */
export async function readHandoffCodeOnServer(): Promise<string | undefined> {
  const store = await cookies();

  return store.get(HANDOFF_COOKIE_NAME)?.value;
}
