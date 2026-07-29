/** 분석 이벤트의 screen_name으로 쓰는 화면 이름 상수. */
export const SCREEN = {
  STORY_LIST: 'storyList',
  STORY_CREATE: 'storyCreate',
  STORY_DETAIL: 'storyDetail',
  CHAT_LIST: 'chatList',
  CHAT: 'chat',
  FEEDBACK: 'feedback',
  SHARE: 'share',
} as const;

/** SCREEN 상수의 값 타입. */
export type ScreenName = (typeof SCREEN)[keyof typeof SCREEN];
