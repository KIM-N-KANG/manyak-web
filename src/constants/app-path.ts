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
  MY_FEEDBACK: '/my/feedback',
  MY_INVITE: '/my/invite',
  MY_LINK_CONTINUE: '/my/link/continue',
  MY_NOTIFICATIONS: '/my/notifications',
  STORY_DETAIL: (id: number | string) => `/stories/${id}`,
  CHAT_ROOM: (id: number | string) => `/chats/${id}`,
  SHARE_VIEW: (shareId: string) => `/share/${shareId}`,
  STUDIO: {
    STORY: {
      SELECT: '/studio/story',
      SIMPLE: '/studio/story/simple',
      GENERAL: '/studio/story/general',
      /** 반려·실패한 검수 제출본을 고쳐 다시 제출하는 일반 제작 폼이다. */
      GENERAL_SUBMISSION: (submissionId: string) =>
        `/studio/story/general?submissionId=${encodeURIComponent(submissionId)}`,
    },
  },
  LEGACY: {
    CREATE: '/create',
    CREATE_STORY: '/create/story',
    NEW_STORY: '/stories/new',
  },
} as const;

export type MainAppPath = (typeof APP_PATH.MAIN)[keyof typeof APP_PATH.MAIN];
