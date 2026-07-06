export const APP_PATH = {
  MAIN: {
    STORIES: '/',
    CHATS: '/chats',
    FEEDBACK: '/feedback',
  },
  STORY_DETAIL: (id: number | string) => `/stories/${id}`,
  CHAT_ROOM: (id: number | string) => `/chats/${id}`,
  CREATOR: {
    STORY: '/stories/new',
  },
  MY_FEEDBACK: '/my/feedback',
} as const;

export type MainAppPath = (typeof APP_PATH.MAIN)[keyof typeof APP_PATH.MAIN];
