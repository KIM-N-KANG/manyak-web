/**
 * 앱 라우트 경로의 정본. 경로 문자열은 하드코딩하지 않고 여기서 가져온다.
 *
 * @remarks
 * 정적 경로는 문자열, 동적 경로는 빌더 함수다. 경로 세그먼트에 id를 넣는 빌더(`STORY_DETAIL` 등)는
 * 값을 인코딩하지 않고, 쿼리 값을 싣는 `EXPLORE_SEARCH`와 `STUDIO.STORY.GENERAL_SUBMISSION`만
 * `encodeURIComponent`로 인코딩한다.
 */
export const APP_PATH = {
  /** 하단 탭 다섯 개의 루트 경로다. */
  MAIN: {
    STORIES: '/',
    CHATS: '/chats',
    STUDIO: '/studio',
    /** 공개 스토리 전체를 무작위 순서로 넘겨 보는 탐색 탭이다. */
    EXPLORE: '/explore',
    MY: '/my',
  },
  /** 탐색 탭 검색바로 여는 스토리 검색 화면이다. 제출한 검색어를 `q`에 남겨 새로고침과 뒤로가기에서 유지한다. */
  EXPLORE_SEARCH: (query?: string) =>
    query
      ? `/explore/search?q=${encodeURIComponent(query)}`
      : '/explore/search',
  LOGIN: '/login',
  /** 팝업 로그인의 콜백 경로다. 페이지가 아니라 로그인 결과를 원래 창에 postMessage로 알리고 팝업을 닫는 `/api/` 라우트 핸들러다. */
  LOGIN_POPUP_COMPLETE: '/api/auth/popup-complete',
  TERMS: '/terms',
  PRIVACY: '/privacy',
  /** 메신저 공유용 앱 안내 경로다. 미리보기 메타를 내고 앱 또는 플레이스토어로 보낸다. */
  APP: '/app',
  /** 공지 게시 푸시의 딥링크(`https://manyak.app/notices/{noticeId}`)와 같은 경로다. */
  NOTICES: '/notices',
  NOTICE_DETAIL: (noticeId: string) => `/notices/${noticeId}`,
  /** 회원 알림함. 받은 알림 내역을 소식, 활동으로 나눠 본다. 알림 설정은 `MY_NOTIFICATIONS`다. */
  NOTIFICATIONS: '/notifications',
  MY_ACCOUNT_DELETION: '/my/account-deletion',
  MY_CREDITS: '/my/credits',
  /** 그로블 결제창의 이동 페이지, 진입 페이지로 등록하는 복귀 화면이다. */
  MY_CREDITS_RETURN: '/my/credits/return',
  MY_FEEDBACK: '/my/feedback',
  MY_INVITE: '/my/invite',
  /** 계정 연동의 중간 화면이다. 현재 계정 재인증 뒤 돌아와 `target` 쿼리의 계정 인증을 이어서 시작한다. */
  MY_LINK_CONTINUE: '/my/link/continue',
  /** 푸시 알림 설정 화면이다. 받은 알림 내역은 `NOTIFICATIONS`다. */
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
      /** 간편 제작과 일반 제작 중 하나를 고르는 화면이다. */
      SELECT: '/studio/story',
      /** 간편 제작 퍼널이다. 구 제작 경로 `/create/story`, `/stories/new` 페이지는 여기로 영구 리다이렉트한다. */
      SIMPLE: '/studio/story/simple',
      /** 새 일반 제작 폼이다. */
      GENERAL: '/studio/story/general',
      /** 반려·실패한 검수 제출본을 고쳐 다시 제출하는 일반 제작 폼이다. */
      GENERAL_SUBMISSION: (submissionId: string) =>
        `/studio/story/general?submissionId=${encodeURIComponent(submissionId)}`,
    },
  },
  /**
   * 예전 제작 경로다. 링크 대상으로 쓰지 않는다. `/create` 페이지는 제작 탭(`MAIN.STUDIO`)으로,
   * `/create/story`, `/stories/new` 페이지는 `STUDIO.STORY.SIMPLE`로 영구 리다이렉트만 한다.
   * `NEW_STORY`는 스토리 상세 판별에서 제외할 때 쓴다.
   */
  LEGACY: {
    CREATE: '/create',
    CREATE_STORY: '/create/story',
    NEW_STORY: '/stories/new',
  },
} as const;

/** 하단 탭 루트 경로의 유니언이다. */
export type MainAppPath = (typeof APP_PATH.MAIN)[keyof typeof APP_PATH.MAIN];
