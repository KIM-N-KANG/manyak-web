'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { TOAST_MESSAGE } from '@/constants/toast-message';

/** Kakao JS SDK v2 스크립트 URL(공식 CDN). invite-screen의 next/script로 lazy 로드한다. */
export const KAKAO_SDK_URL =
  'https://t1.kakaocdn.net/kakao_js_sdk/2.7.7/kakao.min.js';

const KAKAO_SHARE_TITLE = '500 크레딧 받고 시작하기 🎁';
const KAKAO_SHARE_DESCRIPTION =
  '친구 초대 링크로 가입하면 둘 다 500 크레딧을 받아요. 지금 마냑에서 나만의 스토리를 시작해 보세요.';

/** 공유 카드 썸네일. 앱의 opengraph 이미지를 재활용한다(카카오 서버가 가져갈 절대 URL 필요). */
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
 * 카카오톡 공유 훅. handleSdkLoad를 <Script onReady>에 연결한다 — onReady는 최초
 * 로드뿐 아니라 재마운트(스크립트가 이미 캐시된 클라이언트 라우팅 재진입 포함)마다
 * 실행되므로, 그때 앱 키로 초기화하고 isReady=true로 버튼을 활성화한다. onLoad(최초 1회)에
 * 걸면 재진입 시 콜백이 다시 불리지 않아 버튼이 비활성으로 남는다.
 * 준비 전(키 미설정·로드 실패 포함)에는 isReady=false로 버튼을 비활성화한다.
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

  const shareInviteLink = (inviteUrl: string) => {
    if (!window.Kakao?.isInitialized()) {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);

      return;
    }

    const link: KakaoShareLink = {
      mobileWebUrl: inviteUrl,
      webUrl: inviteUrl,
    };

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: KAKAO_SHARE_TITLE,
          description: KAKAO_SHARE_DESCRIPTION,
          imageUrl: shareImageUrl(),
          link,
        },
        buttons: [{ title: '초대 받기', link }],
      });
    } catch {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);
    }
  };

  return { isReady, handleSdkLoad, shareInviteLink };
}
