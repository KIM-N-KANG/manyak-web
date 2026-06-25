export const SCREEN = {
  ONBOARDING: 'onboarding',
  STORY_LIST: 'storyList',
  STORY_CREATE: 'storyCreate',
  STORY_DETAIL: 'storyDetail',
  CHAT_LIST: 'chatList',
  CHAT: 'chat',
  FEEDBACK: 'feedback',
} as const;

export type ScreenName = (typeof SCREEN)[keyof typeof SCREEN];
