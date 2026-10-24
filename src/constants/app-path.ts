export const APP_PATH = {
  MAIN: {
    STORIES: '/',
    CHATS: '/chats',
    STUDIO: '/studio',
    MY: '/my',
  },
  LOGIN: '/login',
  LOGIN_POPUP_COMPLETE: '/api/auth/popup-complete',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  ABOUT: '/about',
  /** 메신저 공유용 앱 안내 경로다. 미리보기 메타를 내고 앱 또는 플레이스토어로 보낸다. */
  APP: '/app',
  /** 공지 게시 푸시의 딥링크(`https://manyak.app/notices/{noticeId}`)와 같은 경로다. */
  NOTICES: '/notices',
  NOTICE_DETAIL: (noticeId: string) => `/notices/${noticeId}`,
  /** 회원 알림함. 받은 알림 내역을 소식·활동으로 나눠 본다. */
  NOTIFICATIONS: '/notifications',
  MY_ACCOUNT_DELETION: '/my/account-deletion',
  MY_CREDITS: '/my/credits',
  /** 그로블 결제창의 이동 페이지·진입 페이지로 등록하는 복귀 화면이다. */
  MY_CREDITS_RETURN: '/my/credits/return',
  MY_FEEDBACK: '/my/feedback',
  MY_INVITE: '/my/invite',
  MY_LINK_CONTINUE: '/my/link/continue',
  MY_NOTIFICATIONS: '/my/notifications',
  MY_PERSONAS: '/my/personas',
  MY_PROFILE_EDIT: '/my/profile/edit',
  MY_PERSONA_NEW: '/my/personas/new',
  MY_PERSONA_EDIT: (id: string) => `/my/personas/${id}/edit`,
  STORY_DETAIL: (id: number | string) => `/stories/${id}`,
  STORY_EDIT: (id: number | string) => `/stories/${id}/edit`,
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
