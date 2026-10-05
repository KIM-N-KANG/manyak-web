export const APP_PATH = {
  MAIN: {
    STORIES: '/',
    CHATS: '/chats',
    STUDIO: '/studio',
    MY: '/my',
  },
  LOGIN: '/login',
  LOGIN_CONTINUE: '/login/continue',
  LOGIN_POPUP_COMPLETE: '/api/auth/popup-complete',
  ONBOARDING: '/onboarding',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  ABOUT: '/about',
  MY_ACCOUNT_DELETION: '/my/account-deletion',
  MY_CREDITS: '/my/credits',
  /** 그로블 결제창의 이동 페이지·진입 페이지로 등록하는 복귀 화면이다. */
  MY_CREDITS_RETURN: '/my/credits/return',
  MY_FEEDBACK: '/my/feedback',
  MY_INVITE: '/my/invite',
  MY_LINK_CONTINUE: '/my/link/continue',
  STORY_DETAIL: (id: number | string) => `/stories/${id}`,
  CHAT_ROOM: (id: number | string) => `/chats/${id}`,
  SHARE_VIEW: (shareId: string) => `/share/${shareId}`,
  STUDIO: {
    STORY: {
      SIMPLE: '/studio/story/simple',
    },
  },
  LEGACY: {
    CREATE: '/create',
    CREATE_STORY: '/create/story',
    NEW_STORY: '/stories/new',
    STUDIO_STORY: '/studio/story',
  },
} as const;

export type MainAppPath = (typeof APP_PATH.MAIN)[keyof typeof APP_PATH.MAIN];
