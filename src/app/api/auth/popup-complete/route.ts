import { randomUUID } from 'node:crypto';

import { auth } from '@/lib/auth/auth';
import {
  isPopupAttempt,
  POPUP_LOGIN_COPY,
  POPUP_LOGIN_MESSAGE_TYPE,
} from '@/lib/auth/popup-login';
import { readBackendSessionTokens } from '@/lib/auth/token-cookies';

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
  const nonce = randomUUID();
  const message = JSON.stringify({
    type: POPUP_LOGIN_MESSAGE_TYPE,
    attempt,
    authenticated,
  });

  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${POPUP_LOGIN_COPY.title}</title></head><body><p>${authenticated ? POPUP_LOGIN_COPY.complete : POPUP_LOGIN_COPY.failed}</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${message},window.location.origin);window.close();}</script></body></html>`,
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
