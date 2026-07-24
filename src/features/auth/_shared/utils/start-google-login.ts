'use client';

import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

import { create as createLoginHandoff } from '@/api/generated/endpoints/auth/auth';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  getCreatedChatIdsSnapshot,
  parseCreatedChatIds,
} from '@/features/chats/_shared/utils/chat-id-storage';
import {
  getCreatedStoryIdsSnapshot,
  parseCreatedStoryIds,
} from '@/features/stories/_shared/utils/story-id-storage';
import { detectInAppBrowser } from '@/lib/in-app-browser';
import { track } from '@/observability/analytics';

import { savePendingHandoff } from './pending-handoff-storage';

type StartGoogleLoginOptions = {
  /** 로그인 완료 후 복귀할 앱 내 상대 경로(호출부에서 resolveLoginCallbackUrl로 검증된 값). */
  redirectTo: string;
};

/**
 * 모든 Google 로그인 CTA의 공통 진입점이다.
 * 일반 브라우저는 곧바로 next-auth signIn을 태우고, SNS 인앱 브라우저는 게스트
 * 데이터를 서버 핸드오프에 맡긴 뒤 현재 주소를 /login/continue로 바꿔 외부 브라우저
 * 전환을 준비한다(스펙 §3-10). 핸드오프 코드는 비밀값이라 로그·분석에 남기지 않는다.
 *
 * @param options.redirectTo 로그인 완료 후 복귀할 앱 내 상대 경로
 */
export async function startGoogleLogin({
  redirectTo,
}: StartGoogleLoginOptions): Promise<void> {
  const inAppBrowser = detectInAppBrowser(navigator.userAgent);

  if (!inAppBrowser) {
    await signIn('google', { redirectTo });

    return;
  }

  const storyIds = parseCreatedStoryIds(getCreatedStoryIdsSnapshot());
  const chatIds = parseCreatedChatIds(getCreatedChatIdsSnapshot());

  try {
    const response = await createLoginHandoff({
      storyIds,
      chatIds,
      callbackPath: redirectTo,
      sourceApp: inAppBrowser,
    });

    // customInstance는 non-2xx에서 throw하므로 정상 흐름은 201뿐이나, 생성 응답 유니온을
    // 성공 분기로 좁히려면 status 확인이 필요하다.
    if (response.status !== 201) {
      toast.error(TOAST_MESSAGE.HANDOFF_CREATE_FAILED);

      return;
    }

    const { handoffCode, handoffId } = response.data;

    if (!handoffCode || !handoffId) {
      toast.error(TOAST_MESSAGE.HANDOFF_CREATE_FAILED);

      return;
    }

    savePendingHandoff({ code: handoffCode, handoffId, storyIds, chatIds });

    track('client_inappBrowser_loginHandoffCreated', {
      app: inAppBrowser,
      handoff_id: handoffId,
    });

    // 자동 전환이 실패해도 ⋯ 메뉴의 '외부 브라우저에서 열기'가 현재 주소를 그대로
    // 전달하도록, 전환 시도 전에 주소부터 핸드오프 URL로 바꾼다(스펙 §3-10 흐름 4).
    const continueUrl = `${APP_PATH.LOGIN_CONTINUE}?handoff=${encodeURIComponent(
      handoffCode,
    )}`;

    window.location.replace(continueUrl);
  } catch {
    toast.error(TOAST_MESSAGE.HANDOFF_CREATE_FAILED);
  }
}
