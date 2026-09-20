'use client';

import { createContext, useContext } from 'react';

/**
 * 세션과 필수 동의를 한 번에 판정한 회원 접근 상태.
 * 회원 기능·회원 전용 조회·로그인 후 부수 효과는 전부 `isMember`만 보고 열어야 한다.
 */
export type MemberAccess = {
  /** 인증됐고 필수 동의까지 마쳐 회원 기능을 열어도 되는 상태다. */
  isMember: boolean;
  /** 세션이 비로그인으로 확정된 상태다. 보호 기능 시도에는 로그인 시트를 연다. */
  isGuest: boolean;
};

/**
 * 프로바이더 밖의 기본값은 둘 다 false다. 판정 전·컨텍스트 밖에서는 회원 기능을 열지도,
 * 로그인 시트를 띄우지도 않는 fail-closed 상태로 둔다.
 */
export const MemberAccessContext = createContext<MemberAccess>({
  isMember: false,
  isGuest: false,
});

/**
 * 동의 게이트가 판정한 회원 접근 상태를 읽는다.
 *
 * @returns 회원 여부와 게스트 확정 여부
 */
export function useMemberAccess(): MemberAccess {
  return useContext(MemberAccessContext);
}
