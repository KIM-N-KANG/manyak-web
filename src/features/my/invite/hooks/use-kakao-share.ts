'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';

import { INVITE_REWARD_COPY } from '../constants';

/** Kakao JS SDK v2 스크립트 URL(공식 CDN). invite-screen의 next/script로 lazy 로드한다. */
export const KAKAO_SDK_URL =
  'https://t1.kakaocdn.net/kakao_js_sdk/2.7.7/kakao.min.js';

/**
 * 공유 카드 썸네일. 카카오 서버가 가져갈 수 있도록 절대 URL을 사용한다.
 *
 * @returns 오픈그래프 이미지의 절대 URL
 */
const shareImageUrl = (): string =>
  `${window.location.origin}/opengraph-image.png`;

type KakaoShareLink = { mobileWebUrl: string; webUrl: string };

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (appKey: string) => void;
  Share: {
    sendDefault: (settings: {
      objectType: 'feed';
      content: {
        title: string;
        description?: string;
        imageUrl: string;
        link: KakaoShareLink;
      };
      buttons?: { title: string; link: KakaoShareLink }[];
    }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

/**
 * 카카오톡 공유 훅. onReady는 스크립트가 캐시된 재진입에서도 실행되므로 SDK 준비
 * 상태를 매 마운트마다 복구할 수 있다. 키 미설정·로드 실패 때는 버튼을 비활성화한다.
 *
 * @returns SDK 준비 여부, SDK 로드 핸들러, 초대 코드 공유 함수
 */
export function useKakaoShare() {
  const [isReady, setIsReady] = useState(false);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  const handleSdkLoad = () => {
    if (!appKey || !window.Kakao) {
      return;
    }

    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(appKey);
    }

    setIsReady(true);
  };

  const shareInviteCode = (inviteCode: string) => {
    if (!window.Kakao?.isInitialized()) {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);

      return;
    }

    const homeUrl = new URL(
      APP_PATH.MAIN.STORIES,
      window.location.origin,
    ).toString();
    const link: KakaoShareLink = {
      mobileWebUrl: homeUrl,
      webUrl: homeUrl,
    };

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: INVITE_REWARD_COPY.kakaoShareTitle,
          description: `초대 코드: ${inviteCode}`,
          imageUrl: shareImageUrl(),
          link,
        },
        buttons: [{ title: '마냑 하러가기', link }],
      });
    } catch {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);
    }
  };

  return { isReady, handleSdkLoad, shareInviteCode };
}
