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
import { HANDOFF_QUERY_PARAM } from '@/lib/auth/handoff-query';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { detectInAppBrowser, type InAppBrowser } from '@/lib/in-app-browser';
import { track } from '@/observability/analytics';
import {
  appendCampaignParams,
  readCampaignParams,
} from '@/observability/analytics/campaign-params';

import { savePendingHandoff } from './pending-handoff-storage';

type StartSocialLoginOptions = {
  /** 로그인에 사용할 소셜 provider. */
  provider: SocialLoginProvider;
  /** 로그인 완료 후 복귀할 앱 내 상대 경로(호출부에서 resolveLoginCallbackUrl로 검증된 값). */
  redirectTo: string;
};

/**
 * 소셜 로그인 시작 결과. 페이지 이탈이 시작됐으면 `redirected`, 현재 화면에 남아
 * 재시도가 필요하면 `failed`다. 호출부는 이 값으로 버튼 로딩 상태를 해제할지 판단한다.
 */
export type SocialLoginOutcome = 'redirected' | 'failed';

/**
 * 모든 소셜 로그인 CTA의 공통 진입점이다(스펙 §3-8·§3-10).
 * 일반 브라우저는 곧바로 next-auth signIn을 태우고, SNS 인앱 브라우저는 게스트
 * 데이터를 서버 핸드오프에 맡긴 뒤 외부 브라우저 전환을 준비한다. 단, 카카오톡 인앱의
 * 카카오 로그인은 카카오가 자사 인앱에서 로그인을 지원하고 저장소 격리도 없으므로
 * 핸드오프 없이 그 자리에서 signIn을 태운다(스펙 §3-10 분기 표).
 *
 * @param options.provider 로그인에 사용할 소셜 provider
 * @param options.redirectTo 로그인 완료 후 복귀할 앱 내 상대 경로
 * @returns 페이지 이탈 시작 여부를 담은 결과
 */
export async function startSocialLogin({
  provider,
  redirectTo,
}: StartSocialLoginOptions): Promise<SocialLoginOutcome> {
  const inAppBrowser = detectInAppBrowser(navigator.userAgent);

  if (!inAppBrowser || (provider === 'kakao' && inAppBrowser === 'kakaotalk')) {
    try {
      await signIn(provider, { redirectTo });
    } catch {
      // signIn은 인가 URL 조회(fetch)가 실패하면 이탈 없이 throw하므로,
      // 사용자에게 알리고 화면에 남는 실패로 처리한다.
      toast.error(TOAST_MESSAGE.LOGIN_FAILED);

      return 'failed';
    }

    return 'redirected';
  }

  return startInAppHandoffLogin({ redirectTo, inAppBrowser });
}

type StartInAppHandoffLoginOptions = {
  /** 로그인 완료 후 복귀할 앱 내 상대 경로. */
  redirectTo: string;
  /** 감지된 인앱 브라우저 종류. */
  inAppBrowser: InAppBrowser;
};

/**
 * 인앱 브라우저에서 게스트 데이터를 서버 핸드오프에 맡긴 뒤 현재 주소를
 * /login/continue로 바꿔 외부 브라우저 전환을 준비한다(스펙 §3-10). provider 선택은
 * 외부 랜딩에서 이뤄지므로 이 단계는 provider와 무관하다. 핸드오프 코드는 비밀값이라
 * 로그·분석에 남기지 않는다.
 *
 * @param options.redirectTo 로그인 완료 후 복귀할 앱 내 상대 경로
 * @param options.inAppBrowser 감지된 인앱 브라우저 종류
 * @returns 페이지 이탈 시작 여부를 담은 결과
 */
export async function startInAppHandoffLogin({
  redirectTo,
  inAppBrowser,
}: StartInAppHandoffLoginOptions): Promise<SocialLoginOutcome> {
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

      return 'failed';
    }

    const { handoffCode, handoffId } = response.data;

    if (!handoffCode || !handoffId) {
      toast.error(TOAST_MESSAGE.HANDOFF_CREATE_FAILED);

      return 'failed';
    }

    savePendingHandoff({ code: handoffCode, handoffId, storyIds, chatIds });

    track('client_inappBrowser_loginHandoffCreated', {
      app: inAppBrowser,
      handoff_id: handoffId,
    });

    // 자동 전환이 실패해도 ⋯ 메뉴의 '외부 브라우저에서 열기'가 현재 주소를 그대로
    // 전달하도록, 전환 시도 전에 주소부터 핸드오프 URL로 바꾼다(스펙 §3-10 흐름 4).
    // 캠페인 파라미터를 함께 실어 외부 브라우저의 유입 출처를 잇는다 — 외부 브라우저는
    // 저장소가 격리된 데다 스킴으로 실행돼 referrer도 없어, URL이 유일한 전달 수단이다.
    const continueUrl = appendCampaignParams(
      `${APP_PATH.LOGIN_CONTINUE}?${HANDOFF_QUERY_PARAM}=${encodeURIComponent(
        handoffCode,
      )}`,
      readCampaignParams(),
    );

    window.location.replace(continueUrl);

    return 'redirected';
  } catch {
    toast.error(TOAST_MESSAGE.HANDOFF_CREATE_FAILED);

    return 'failed';
  }
}
