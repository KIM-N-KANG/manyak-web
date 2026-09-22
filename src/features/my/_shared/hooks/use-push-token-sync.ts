'use client';

import { useEffect } from 'react';

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

import { resolvePushLinkPath } from '../utils/push-link';
import {
  PUSH_PERMISSION_EVENT,
  readNotificationPermission,
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

    return () => {
      cancelled = true;
      window.removeEventListener(PUSH_PERMISSION_EVENT, sync);
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
