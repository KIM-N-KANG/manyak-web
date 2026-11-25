import { randomUUID } from 'node:crypto';

import { auth } from '@/lib/auth/auth';
import {
  isPopupAttempt,
  POPUP_LOGIN_COPY,
  POPUP_LOGIN_MESSAGE_TYPE,
} from '@/lib/auth/popup-login';
import { readPendingSignupConsent } from '@/lib/auth/signup-consent-cookie';
import { readBackendSessionTokens } from '@/lib/auth/token-cookies';

/**
 * 팝업 로그인이 OAuth를 마치고 돌아오는 콜백 문서를 돌려준다.
 *
 * @returns `attempt`가 UUID가 아니면 본문 없는 400, 그 밖에는 결과 문구와 알림 스크립트를 담은 HTML 응답
 * @remarks
 * 팝업 안에서 세션과 백엔드 토큰을 함께 확인해 로그인 성공, 가입 동의 대기, 실패를 판정하고,
 * 인라인 스크립트가 같은 origin으로만 원래 창에 결과를 `postMessage`한 뒤 팝업을 닫는다.
 * 메시지는 완료 알림일 뿐 자격증명을 싣지 않는다. 스크립트는 요청마다 만든 nonce로만 실행되게
 * CSP를 잠그고, 로그인 결과가 캐시되거나 색인되지 않게 `no-store`, `noindex`를 붙인다.
 */
export async function GET(request: Request): Promise<Response> {
  const attempt = new URL(request.url).searchParams.get('attempt');

  if (!isPopupAttempt(attempt)) {
    return new Response(null, {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const [session, tokens] = await Promise.all([
    auth(),
    readBackendSessionTokens(),
  ]);
  const authenticated = Boolean(session?.user?.id && tokens);
  // 필수 동의가 남은 로그인은 세션 없이 대기 쿠키만 남는다. 원래 창이 동의를 이어 가도록 알린다.
  const consentRequired =
    !authenticated && (await readPendingSignupConsent()) !== null;
  const nonce = randomUUID();
  const message = JSON.stringify({
    type: POPUP_LOGIN_MESSAGE_TYPE,
    attempt,
    authenticated,
    consentRequired,
  });

  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${POPUP_LOGIN_COPY.title}</title></head><body><p>${authenticated || consentRequired ? POPUP_LOGIN_COPY.complete : POPUP_LOGIN_COPY.failed}</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${message},window.location.origin);window.close();}</script></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, noarchive',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
      },
    },
  );
}
