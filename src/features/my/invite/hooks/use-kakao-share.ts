'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { TOAST_MESSAGE } from '@/constants/toast-message';

/** Kakao JS SDK v2 스크립트 URL(공식 CDN). invite-screen의 next/script로 lazy 로드한다. */
export const KAKAO_SDK_URL =
  'https://t1.kakaocdn.net/kakao_js_sdk/2.7.7/kakao.min.js';

const KAKAO_SHARE_TEXT =
  '마냑에서 나만의 스토리를 만들고 채팅해 보세요!\n이 링크로 가입하면 우리 둘 다 500 크레딧을 받아요.';

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (appKey: string) => void;
  Share: {
    sendDefault: (settings: {
      objectType: 'text';
      text: string;
      link: { mobileWebUrl: string; webUrl: string };
      buttonTitle?: string;
    }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

/**
 * 카카오톡 공유 훅. SDK 로드 완료(handleSdkLoad) 시 앱 키로 초기화하고,
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

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'text',
        text: KAKAO_SHARE_TEXT,
        link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl },
        buttonTitle: '초대 받기',
      });
    } catch {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);
    }
  };

  return { isReady, handleSdkLoad, shareInviteLink };
}
