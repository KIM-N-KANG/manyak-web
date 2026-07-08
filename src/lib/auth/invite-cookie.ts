import { cookies } from 'next/headers';

/**
 * 초대 URL(/invite/[code]) 진입 시 받은 초대 코드를 Google OAuth 리다이렉트를 건너
 * 로그인(NextAuth jwt 콜백)까지 나르는 httpOnly 쿠키. 로그인 성공 시 삭제한다.
 *
 * 수명 24시간 = 초대 어트리뷰션 윈도우(초대 진입 후 이 시간 안에 가입해야 보상 인정,
 * 스펙 §4-3-7). 코드 유효성 판정(자기 코드·기존 회원·월 한도)은 전부 서버 몫이므로
 * 여기서는 쓰레기값 방어 수준의 형식 검증만 한다.
 */
export const INVITE_CODE_COOKIE = 'manyak_invite_code';

const INVITE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

// 서버 발급 코드는 영숫자 8자지만, 길이 정책이 바뀌어도 깨지지 않도록 여유를 둔다.
const INVITE_CODE_PATTERN = /^[A-Za-z0-9]{1,64}$/;

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: INVITE_COOKIE_MAX_AGE_SECONDS,
} as const;

/** URL 경로에서 온 초대 코드의 형식이 유효한지 확인한다(판정은 서버 몫 — 형식 방어만). */
export function isValidInviteCode(code: string): boolean {
  return INVITE_CODE_PATTERN.test(code);
}

/** 초대 코드를 쿠키에 저장한다. 무효 형식이면 조용히 무시한다(진입 자체는 막지 않음). */
export async function writeInviteCodeCookie(code: string): Promise<void> {
  if (!isValidInviteCode(code)) {
    return;
  }

  const store = await cookies();

  store.set(INVITE_CODE_COOKIE, code, COOKIE_OPTIONS);
}

/** 저장된 초대 코드를 읽는다. 없거나 손상(무효 형식)이면 null. */
export async function readInviteCodeCookie(): Promise<string | null> {
  const store = await cookies();
  const code = store.get(INVITE_CODE_COOKIE)?.value;

  if (!code || !isValidInviteCode(code)) {
    return null;
  }

  return code;
}

/** 초대 코드 쿠키를 삭제한다(로그인 성공으로 역할이 끝났을 때). */
export async function clearInviteCodeCookie(): Promise<void> {
  const store = await cookies();

  store.delete(INVITE_CODE_COOKIE);
}
