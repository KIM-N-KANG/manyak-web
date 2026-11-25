import { randomUUID } from 'node:crypto';

import { APP_PATH } from '@/constants/app-path';
import { formatDocumentTitle } from '@/constants/site';
import { CREDIT_CHARGE_COPY } from '@/features/my/credits/constants';
import {
  PAYMENT_HISTORY_LENGTH_STORAGE_KEY,
  resolvePaymentRewindDistance,
} from '@/features/my/credits/utils/payment-return-history';

/**
 * 결제창에서 돌아온 탭을 결제 전 화면으로 되감는 정적 문서를 돌려준다.
 *
 * @returns 되감기 스크립트만 담은 HTML 응답
 * @remarks
 * 앱 셸을 띄우지 않고 인라인 스크립트만 실행한다. 스크립트는 결제 직전에 남긴 히스토리 길이를
 * 세션스토리지에서 읽고 바로 지운 뒤, 되감을 칸 수가 나오면 `history.go(-d)`로 돌아가고 없으면
 * 이프 충전 화면으로 `location.replace`한다. 칸 수 계산은 `resolvePaymentRewindDistance`의 소스를
 * 그대로 삽입해 실행하므로 그 함수는 바깥 값을 참조하면 안 된다.
 *
 * @see resolvePaymentRewindDistance
 */
export function GET(): Response {
  const nonce = randomUUID();
  const script = `var k=${JSON.stringify(PAYMENT_HISTORY_LENGTH_STORAGE_KEY)},r=null;try{r=sessionStorage.getItem(k);sessionStorage.removeItem(k)}catch(e){}var d=(${resolvePaymentRewindDistance.toString()})(r,history.length);if(d)history.go(-d);else location.replace(${JSON.stringify(APP_PATH.MY_CREDITS)})`;

  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${formatDocumentTitle(CREDIT_CHARGE_COPY.title)}</title></head><body><script nonce="${nonce}">${script}</script></body></html>`,
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
