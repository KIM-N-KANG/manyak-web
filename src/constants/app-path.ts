export const APP_PATH = {
  LANDING: '/',
  MAIN: {
    STORIES: '/stories',
    CHATS: '/chats',
  },
  CREATOR: {
    STORY: '/stories/new',
  },
} as const;

export type MainAppPath = (typeof APP_PATH.MAIN)[keyof typeof APP_PATH.MAIN];
