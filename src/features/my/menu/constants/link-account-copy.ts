import type { SocialLoginProvider } from '@/lib/auth/social-provider';

/** provider 표시 이름. Chip·버튼·다이얼로그·토스트가 공유하는 정본이다. */
export const PROVIDER_LABEL: Record<SocialLoginProvider, string> = {
  google: 'Google',
  kakao: '카카오',
};

/** 마이 페이지 계정 연동 UI 카피 정본. E2E 단언도 이 상수를 쓴다. */
export const LINK_ACCOUNT_COPY = {
  sectionLabel: '연동된 계정',
  linkButton: (provider: SocialLoginProvider) =>
    `${PROVIDER_LABEL[provider]} 연동하기`,
  confirmTitle: (provider: SocialLoginProvider) =>
    `${PROVIDER_LABEL[provider]} 계정을 연동할까요?`,
  confirmDescription: (current: SocialLoginProvider) => [
    '어느 계정으로 로그인해도 같은 스토리와 채팅을 보고, 크레딧을 쓸 수 있어요',
    `보안을 위해 지금 로그인한 ${PROVIDER_LABEL[current]} 계정으로 먼저 다시 로그인한 뒤 연동이 진행돼요`,
    '연동한 뒤에는 해제할 수 없어요',
  ],
  confirmCancel: '나중에 하기',
  confirmAction: '연동하기',
  confirmPending: '연동 준비 중',
  linkedToOtherTitle: '이미 다른 계정에 연결되어 있어요',
  linkedToOtherDescription:
    '이 소셜 계정은 이미 다른 마냑 계정에 연결되어 있어요. 그 계정을 쓰려면 로그아웃한 뒤 해당 계정으로 로그인해주세요.',
  linkedToOtherAction: '확인',
} as const;
