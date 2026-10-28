'use client';

import type { MouseEvent } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import { leaveLayers } from '@/lib/history-layers';

export function LoginLegalLinks() {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    leaveLayers(() => router.push(href));
  };

  return (
    <p className="flex items-center justify-center gap-2 text-xs text-foreground-secondary">
      <Link
        href={APP_PATH.TERMS}
        className="underline underline-offset-2"
        onClick={(event) => handleClick(event, APP_PATH.TERMS)}>
        {LOGIN_COPY.legalTerms}
      </Link>
      <span aria-hidden="true" className="h-3 w-px bg-border" />
      <Link
        href={APP_PATH.PRIVACY}
        className="underline underline-offset-2"
        onClick={(event) => handleClick(event, APP_PATH.PRIVACY)}>
        {LOGIN_COPY.legalPrivacy}
      </Link>
    </p>
  );
}
