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

  useEffect(() => {
    if (isOnboardingSeen()) {
      return;
    }

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
