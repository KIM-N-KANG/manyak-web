export const APP_PATH = {
  LANDING: '/',
  MAIN: {
    STORIES: '/',
    CHATS: '/chats',
  },
  STORY_DETAIL: (id: number | string) => `/stories/${id}`,
  CHAT_ROOM: (id: number | string) => `/chats/${id}`,
  CREATOR: {
    STORY: '/stories/new',
  },
} as const;

export type MainAppPath = (typeof APP_PATH.MAIN)[keyof typeof APP_PATH.MAIN];
