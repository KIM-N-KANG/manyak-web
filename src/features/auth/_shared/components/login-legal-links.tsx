import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';

export function LoginLegalLinks() {
  return (
    <p className="flex items-center justify-center gap-2 text-xs text-foreground-secondary">
      <Link href={APP_PATH.TERMS} className="underline underline-offset-2">
        {LOGIN_COPY.legalTerms}
      </Link>
      <span aria-hidden="true" className="h-3 w-px bg-border" />
      <Link href={APP_PATH.PRIVACY} className="underline underline-offset-2">
        {LOGIN_COPY.legalPrivacy}
      </Link>
    </p>
  );
}
