export const APP_PATH = {
  MAIN: {
    STORIES: '/',
    CHATS: '/chats',
    MY: '/my',
  },
  LOGIN: '/login',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  MY_FEEDBACK: '/my/feedback',
  MY_INVITE: '/my/invite',
  STORY_DETAIL: (id: number | string) => `/stories/${id}`,
  CHAT_ROOM: (id: number | string) => `/chats/${id}`,
  CREATOR: {
    STORY: '/stories/new',
  },
} as const;

export type MainAppPath = (typeof APP_PATH.MAIN)[keyof typeof APP_PATH.MAIN];
