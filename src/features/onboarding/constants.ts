export const ONBOARDING_SEEN_STORAGE_KEY = 'manyak:onboarding-seen';
export const ONBOARDING_SEEN_VALUE = '1';

/**
 * 게스트(비로그인) 체험 한도. 안내 문구 표시용이며 실제 강제는 백엔드가 한다.
 * 정책 변경 시 이 값과 백엔드를 함께 맞춰야 한다.
 */
export const GUEST_LIMITS = {
  storylineCreate: 5,
  storyCreate: 1,
  chat: 5,
} as const;
