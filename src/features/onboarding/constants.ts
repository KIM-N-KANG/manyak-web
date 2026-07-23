export const ONBOARDING_SEEN_STORAGE_KEY = 'manyak:onboarding-seen';
export const ONBOARDING_SEEN_VALUE = '1';

export const ONBOARDING_ENTRY_STORAGE_KEY = 'manyak:onboarding-entry';
export const ONBOARDING_ENTRY_VALUE = '1';

export const ONBOARDING_TITLE_LINES = [
  '키워드 몇 개로,',
  '나만의 스토리 완성',
] as const;

export const ONBOARDING_DESCRIPTION =
  '복잡한 설정 없이 스토리를 만들고 AI와 채팅하며 나만의 전개를 이어가보세요';

/**
 * 게스트(비로그인) 체험 한도. 안내 문구 표시용이며 실제 강제는 백엔드가 한다.
 * 정책 변경 시 이 값과 백엔드를 함께 맞춰야 한다.
 */
export const GUEST_LIMITS = {
  storylineCreate: 5,
  storyCreate: 1,
  chat: 5,
} as const;
