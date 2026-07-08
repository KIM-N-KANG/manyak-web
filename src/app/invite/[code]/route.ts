import { NextResponse } from 'next/server';

import { APP_PATH } from '@/constants/app-path';
import { writeInviteCodeCookie } from '@/lib/auth/invite-cookie';
import { hasNextAuthSessionCookie } from '@/lib/auth/token-cookies';

/**
 * 초대 공유 링크(inviteUrl)의 진입점. 경로는 백엔드 설정 MANYAK_INVITE_BASE_URL
 * (`{웹도메인}/invite`)과 일치해야 한다.
 *
 * 초대 코드를 httpOnly 쿠키에 담아 Google OAuth 리다이렉트 너머의 로그인 처리
 * (establishBackendSession)까지 나른다. 이미 로그인된 사용자는 가입할 수 없어
 * 보상 대상이 아니므로 쿠키 없이 홈으로 보낸다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const origin = new URL(request.url).origin;

  if (await hasNextAuthSessionCookie()) {
    return NextResponse.redirect(new URL(APP_PATH.MAIN.STORIES, origin));
  }

  await writeInviteCodeCookie(safeDecode(code));

  return NextResponse.redirect(new URL(APP_PATH.LOGIN, origin));
}

/** 경로 세그먼트는 인코딩된 채 들어올 수 있다. 손상된 인코딩은 원문 그대로 형식 검증에 맡긴다. */
const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
