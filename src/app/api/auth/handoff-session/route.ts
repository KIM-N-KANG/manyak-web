import {
  BackendAuthError,
  confirmHandoffOnServer,
} from '@/lib/auth/backend-client';
import {
  HANDOFF_COOKIE_MAX_AGE_SECONDS,
  HANDOFF_COOKIE_NAME,
} from '@/lib/auth/handoff-cookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 핸드오프 코드를 확인하고 HttpOnly 쿠키로 옮긴 응답을 만든다.
 * 백엔드 확인 API로 코드를 검증하고(무효·만료면 404를 그대로 전달해 랜딩이 만료 안내를
 * 띄우게 한다. 그 외 실패는 502), 유효하면 쿠키를 심어 이후 로그인 콜백이 읽게 한다(스펙
 * §3-10 흐름 5). 코드는 응답 body에 되돌려주지 않으며 요약(건수·복귀 경로)만 반환한다.
 *
 * @param code 검증할 핸드오프 코드 원문
 * @returns 요약 + Set-Cookie를 담은 응답(실패 시 에러 상태)
 */
async function createHandoffSession(code: string): Promise<Response> {
  let summary;

  try {
    summary = await confirmHandoffOnServer(code);
  } catch (error) {
    const status = error instanceof BackendAuthError ? error.status : 502;

    return Response.json(
      { error: '핸드오프 확인에 실패했어요.' },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const response = Response.json(summary);

  response.headers.append(
    'Set-Cookie',
    `${HANDOFF_COOKIE_NAME}=${encodeURIComponent(code)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${HANDOFF_COOKIE_MAX_AGE_SECONDS}; Secure`,
  );
  response.headers.set('Cache-Control', 'no-store');

  return response;
}

/**
 * 같은 출처에서 온 JSON 제출인지 확인한다.
 *
 * 이 엔드포인트는 인증 없이 로그인용 쿠키를 심으므로, 공격자 페이지가 자기 핸드오프
 * 코드를 피해자 브라우저에 심어 다음 로그인에 소비시키는 CSRF가 성립한다. JSON
 * Content-Type을 강제하면 프리플라이트 없이 보낼 수 있는 폼 전송(text/plain 등)이
 * 막히고, Sec-Fetch-Site로 한 번 더 거른다(미지원 브라우저는 Origin·Host로 대체한다).
 *
 * @param request 검사할 요청
 * @returns 같은 출처의 JSON 요청이면 true
 */
function isSameOriginJsonRequest(request: Request): boolean {
  if (!request.headers.get('Content-Type')?.includes('application/json')) {
    return false;
  }

  const site = request.headers.get('Sec-Fetch-Site');

  if (site) {
    return site === 'same-origin';
  }

  const origin = request.headers.get('Origin');

  if (!origin) {
    return false;
  }

  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('Host');

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOriginJsonRequest(request)) {
    return Response.json(
      { error: '허용되지 않은 요청이에요.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { code?: string };

  if (!body.code) {
    return Response.json({ error: 'code가 필요합니다.' }, { status: 400 });
  }

  return createHandoffSession(body.code);
}
