import { randomUUID } from 'node:crypto';

import { APP_PATH } from '@/constants/app-path';
import { formatDocumentTitle } from '@/constants/site';
import { CREDIT_CHARGE_COPY } from '@/features/my/credits/constants';
import {
  PAYMENT_HISTORY_LENGTH_STORAGE_KEY,
  resolvePaymentRewindDistance,
} from '@/features/my/credits/utils/payment-return-history';

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
