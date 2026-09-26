'use client';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useRegister } from '@/api/generated/endpoints/push/push';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { IS_PUSH_ENABLED } from '@/lib/push/config';
import {
  requestPushToken,
  subscribeForegroundMessages,
} from '@/lib/push/messaging';

import {
  advanceMarketingConsentRecord,
  hasAskedPushPermission,
  markPushPermissionAsked,
  readMarketingConsentRecord,
  writeMarketingConsentRecord,
} from '../utils/marketing-consent-storage';
import { requestMarketingConsentReask } from '../utils/marketing-consent-store';
import { resolvePushLinkPath } from '../utils/push-link';
import {
  isIosDevice,
  isStandaloneDisplay,
  PUSH_PERMISSION_EVENT,
  readNotificationPermission,
  requestNotificationPermission,
} from '../utils/push-permission';
import { isPushForCurrentUser } from '../utils/push-recipient';
import { writeRegisteredPushToken } from '../utils/push-token-storage';

/**
 * 회원 세션에서 FCM 토큰을 서버에 동기화하고 포그라운드 메시지를 토스트로 보여주는 훅.
 *
 * - 회원(필수 동의 완료)이고 알림 권한이 `granted`일 때만 토큰을 발급해 `PUT`한다.
 *   등록은 멱등이라 앱 시작마다 보낸다. 권한이 나중에 허용되면 이벤트로 다시 돈다.
 * - 페이지가 열려 있을 때 도착한 메시지는 브라우저가 표시하지 않으므로 토스트로
 *   보여주되, `recipientId`가 현재 회원이 아니면 버린다.
 */
export function usePushTokenSync() {
  const { data: session } = useSession();
  const { isMember } = useMemberAccess();
  const router = useRouter();
  const registerToken = useRegister();
  const userId = session?.user?.id ?? null;
  const shouldSync = IS_PUSH_ENABLED && isMember && userId !== null;
  const { mutate: registerMutate } = registerToken;
  const enteredUserIdRef = useRef<string | null>(null);

  // 회원 화면이 처음 열릴 때(페이지 로드당 한 번) Android의 앱 시작과 같은 일을 한다.
  // 권한이 미결정이면 이 기기에서 한 번 자동으로 묻고(제스처 없이는 Safari가 무시하므로
  // 필수 동의 시트·설정 화면의 버튼이 보조 경로다), 광고 동의 재진입 횟수를 센다.
  useEffect(() => {
    if (!shouldSync || enteredUserIdRef.current === userId) {
      return;
    }

    enteredUserIdRef.current = userId;

    if (
      readNotificationPermission() === 'default' &&
      !hasAskedPushPermission() &&
      !(isIosDevice() && !isStandaloneDisplay())
    ) {
      markPushPermissionAsked();
      void requestNotificationPermission().catch(() => undefined);
    }

    const step = advanceMarketingConsentRecord(
      readMarketingConsentRecord(userId),
    );

    if (step.record) {
      writeMarketingConsentRecord(userId, step.record);
    }

    if (step.shouldReask) {
      requestMarketingConsentReask(userId);
    }
  }, [shouldSync, userId]);

  useEffect(() => {
    if (!shouldSync) {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      if (readNotificationPermission() !== 'granted') {
        return;
      }

      const token = await requestPushToken().catch(() => null);

      if (!token || cancelled) {
        return;
      }

      registerMutate(
        { data: { token, platform: 'WEB' } },
        { onSuccess: () => writeRegisteredPushToken(token) },
      );
    };

    void sync();
    window.addEventListener(PUSH_PERMISSION_EVENT, sync);
    window.addEventListener('online', sync);

    return () => {
      cancelled = true;
      window.removeEventListener(PUSH_PERMISSION_EVENT, sync);
      window.removeEventListener('online', sync);
    };
  }, [shouldSync, registerMutate]);

  useEffect(() => {
    if (!shouldSync) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void subscribeForegroundMessages((payload) => {
      if (!isPushForCurrentUser(payload.data?.recipientId, userId)) {
        return;
      }

      const title = payload.notification?.title ?? payload.data?.title;

      if (!title) {
        return;
      }

      const path = resolvePushLinkPath(
        payload.fcmOptions?.link ?? payload.data?.deepLink,
        window.location.origin,
      );

      toast(title, {
        description: payload.notification?.body ?? payload.data?.body,
        action: path
          ? { label: '보기', onClick: () => router.push(path) }
          : undefined,
      });
    }).then((dispose) => {
      if (cancelled) {
        dispose();
      } else {
        unsubscribe = dispose;
      }
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [shouldSync, userId, router]);
}
