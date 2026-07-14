'use client';

import { useEffect, useRef } from 'react';

import { signOut, useSession } from 'next-auth/react';

import { APP_PATH } from '@/constants/app-path';
import {
  SESSION_EXPIRED_PARAM,
  subscribeSessionExpired,
} from '@/lib/auth/session-expiry';
import { resetAnalyticsUser } from '@/observability/analytics';

export function SessionExpiryWatcher() {
  const { status } = useSession();
  const statusRef = useRef(status);
  const isHandlingRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      if (isHandlingRef.current || statusRef.current === 'unauthenticated') {
        return;
      }

      isHandlingRef.current = true;

      resetAnalyticsUser();
      void signOut({
        redirectTo: `${APP_PATH.LOGIN}?${SESSION_EXPIRED_PARAM}`,
      });
    });
  }, []);

  return null;
}
