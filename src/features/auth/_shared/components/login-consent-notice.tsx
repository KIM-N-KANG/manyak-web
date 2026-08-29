import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';

export function LoginConsentNotice() {
  return (
    <p className="shrink-0 text-center text-xs leading-relaxed text-foreground-secondary">
      로그인하면{' '}
      <Link
        href={APP_PATH.TERMS}
        target="_blank"
        rel="noopener noreferrer"
        className="underline">
        서비스 이용약관
      </Link>
      과{' '}
      <Link
        href={APP_PATH.PRIVACY}
        target="_blank"
        rel="noopener noreferrer"
        className="underline">
        개인정보 처리방침
      </Link>
      에
      <br />
      동의하는 것으로 간주해요
    </p>
  );
}
