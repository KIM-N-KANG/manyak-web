/** 마이와 이프 충전이 함께 쓰는 친구 초대 진입 메뉴의 라벨. */
export const INVITE_MENU_LABEL = '친구 초대';

/**
 * 초대 메뉴의 보조 문구를 만든다. 라벨과 이어 "친구 초대 + 하고 N 이프 받기"로 읽힌다.
 *
 * @param amount 초대자와 제출자가 각각 받는 이프의 표시 문자열
 * @returns 메뉴 보조 문구
 */
export const buildInviteMenuSubLabel = (amount: string) =>
  `하고 ${amount} 이프 받기`;
