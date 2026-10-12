import { type AppBannerVariant } from '@/lib/app-banner';

type AppBannerVariantCopy = {
  message: string;
  action: string;
  actionLabel: string;
};

const ANDROID_COPY: AppBannerVariantCopy = {
  message: '앱으로 즐겨보세요',
  action: '앱 열기',
  actionLabel: '앱 열기',
};

/** 배너 변형별 문구다. 계약 문구의 정본은 하네스 3-2 웹 스펙 "앱 안내 배너"다. */
export const APP_BANNER_VARIANT_COPY: Record<
  AppBannerVariant,
  AppBannerVariantCopy
> = {
  android_inapp: ANDROID_COPY,
  android_browser: ANDROID_COPY,
  ios_inapp: {
    message: '외부 브라우저로 즐겨보세요',
    action: '열기',
    actionLabel: '외부 브라우저로 열기',
  },
  ios_browser: {
    message: '홈 화면에 추가해 보세요',
    action: '추가하기',
    actionLabel: '홈 화면에 추가하기',
  },
};

/** 배너 영역, 닫기, 안내 시트 문구다. */
export const APP_BANNER_COPY = {
  regionLabel: '앱 안내',
  closeLabel: '닫기',
  homeScreenGuide: {
    title: '홈 화면에 추가하기',
    imageSteps: [
      {
        src: '/app-banner/ios-safari-step-1.webp',
        alt: 'Safari 메뉴의 공유 항목',
        label: '하단 ⋯ 누르고 "공유" 누르기',
      },
      {
        src: '/app-banner/ios-safari-step-2.webp',
        alt: '공유 시트의 더 보기 버튼',
        label: '"더 보기" 누르기',
      },
      {
        src: '/app-banner/ios-safari-step-3.webp',
        alt: '공유 시트의 홈 화면에 추가 항목',
        label: '"홈 화면에 추가" 누르기',
      },
      {
        src: '/app-banner/ios-safari-step-4.webp',
        alt: '홈 화면에 추가 창의 추가 버튼',
        label: '"추가" 누르기',
      },
    ],
    textSteps: ['공유 버튼 누르기', '"홈 화면에 추가" 누르기'],
    textHint: '공유 버튼이 안 보이면 ⋯를 먼저 눌러주세요',
  },
  escapeGuide: {
    title: '외부 브라우저로 열어주세요',
    description: '⋯ 메뉴에서 "브라우저로 열기"를 눌러주세요',
    copyLink: '링크 복사하기',
    linkCopied: '링크를 복사했어요',
    linkCopyFailed: '링크를 복사하지 못했어요',
  },
} as const;
