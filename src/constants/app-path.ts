export const APP_PATH = {
  MAIN: {
    STORIES: '/',
    CHATS: '/chats',
    MORE: '/more',
  },
  LOGIN: '/login',
  LOGIN_CONTINUE: '/login/continue',
  ONBOARDING: '/onboarding',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  MORE_ABOUT: '/more/about',
  MORE_FEEDBACK: '/more/feedback',
  MORE_INVITE: '/more/invite',
  STORY_DETAIL: (id: number | string) => `/stories/${id}`,
  CHAT_ROOM: (id: number | string) => `/chats/${id}`,
  CREATOR: {
    STORY: '/stories/new',
  },
} as const;

export type MainAppPath = (typeof APP_PATH.MAIN)[keyof typeof APP_PATH.MAIN];
