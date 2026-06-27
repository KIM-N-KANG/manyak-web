'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { APP_PATH } from '@/constants/app-path';
import { track } from '@/lib/analytics';

import {
  isOnboardingSeen,
  markOnboardingSeen,
} from '../utils/onboarding-storage';

export function useOnboardingDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // SSR/하이드레이션 깜빡임을 막기 위해 초기엔 닫힌 상태로 두고,
  // 클라이언트 마운트 후 localStorage(외부 시스템)를 보고 노출 여부를 결정한다.
  useEffect(() => {
    if (isOnboardingSeen()) {
      return;
    }

    // 서버·hydration 첫 렌더는 open=false로 맞춰 mismatch를 피하고, 마운트 후
    // 한 번만 노출을 결정하는 정당한 effect-setState다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    track('client_onboarding_viewed');
  }, []);

  const handleStartCreate = () => {
    markOnboardingSeen();
    track('client_onboarding_createButton_clicked');
    router.push(APP_PATH.CREATOR.STORY);
  };

  return { open, handleStartCreate };
}
