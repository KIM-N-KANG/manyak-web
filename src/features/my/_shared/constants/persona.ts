/** 회원이 계정에 저장할 수 있는 페르소나 수의 상한이다. 서버는 넘으면 409로 거절한다. */
export const PERSONA_MAX_COUNT = 10;

/** 마이 메뉴에서 페르소나 관리로 들어가는 섹션과 메뉴 문구다. */
export const PERSONA_MENU_COPY = {
  sectionLabel: '페르소나',
  menuLabel: '페르소나 관리',
} as const;
