'use client';

import type { MouseEvent } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import { leaveLayers } from '@/lib/history-layers';

/**
 * 로그인 화면과 시트에 두는 이용약관, 개인정보 처리방침 링크.
 * 보조 키를 누른 클릭(새 탭 열기 등)은 브라우저 기본 동작에 맡기고, 일반 클릭은 열린 시트의
 * 히스토리 더미를 먼저 소비(`leaveLayers`)한 뒤 이동해 돌아올 때 빈 칸이 남지 않게 한다.
 */
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
