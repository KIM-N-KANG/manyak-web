'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { APP_PATH } from '@/constants/app-path';

/** 회원 전용 페르소나 화면에 게스트로 들어오면 로그인 화면으로 보내는 훅. */
export function useGuestLoginRedirect() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }
  }, [status, router]);
}
