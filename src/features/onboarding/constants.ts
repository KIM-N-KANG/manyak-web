export const ONBOARDING_TOURS = {
  STORY_LIST: 'storyList',
  STORY_CREATE: 'storyCreate',
  CHAT: 'chat',
} as const;

export type OnboardingTourName =
  (typeof ONBOARDING_TOURS)[keyof typeof ONBOARDING_TOURS];

export const onboardingStorageKey = (tour: OnboardingTourName): string =>
  `manyak:onboarding:${tour}`;

export const ONBOARDING_TARGET = {
  CREATE_STORY: 'create-story',
  KEYWORD_TABS: 'keyword-tabs',
  KEYWORD_CATEGORIES: 'keyword-categories',
  GENERATE_BUTTON: 'generate-button',
  CHAT_STORY: 'chat-story',
  CHAT_INPUT: 'chat-input',
} as const;

export const onbordaSelector = (target: string): string =>
  `[data-onborda="${target}"]`;
