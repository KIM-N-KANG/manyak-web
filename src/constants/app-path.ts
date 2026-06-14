export const APP_PATH = {
  LANDING: '/',
  MAIN: {
    STORY: '/story',
    CHAT_LIST: '/chat-list',
  },
} as const;

export type MainAppPath = (typeof APP_PATH.MAIN)[keyof typeof APP_PATH.MAIN];
