export const ONBOARDING_TOURS = {
  STORY_LIST: 'storyList',
  KEYWORD_SELECT: 'keywordSelect',
  STORYLINE_SELECT: 'storylineSelect',
  ADDITIONAL_INFO: 'additionalInfo',
  CHAT: 'chat',
} as const;

export type OnboardingTourName =
  (typeof ONBOARDING_TOURS)[keyof typeof ONBOARDING_TOURS];

export const onboardingStorageKey = (tour: OnboardingTourName): string =>
  `manyak:onboarding:${tour}`;

export const ONBOARDING_TARGET = {
  CREATE_STORY: 'create-story',
  KEYWORD_TABS: 'keyword-tabs',
  STORYLINE_TABS: 'storyline-tabs',
  RECOMMENDED_INFO: 'recommended-info',
  ADDITIONAL_INFO_INPUT: 'additional-info-input',
  CHAT_INPUT: 'chat-input',
} as const;

export const onbordaSelector = (target: string): string =>
  `[data-onborda="${target}"]`;
