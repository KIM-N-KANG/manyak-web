'use client';

import { useState } from 'react';

import { useMemberAccess } from './use-member-access';

type Preventable = { preventDefault: () => void };

/**
 * 보호 기능(제작·채팅) 진입점이 요청·이동 전에 회원 여부를 한 번 확인하게 하는 훅.
 * 회원이 아니면 기본 동작을 막고 true를 돌려주며, 세션이 게스트로 확정된 경우에만 로그인
 * 시트를 연다. 세션 판정·동의 조회 중이거나 동의가 남은 상태에서는 시트 없이 조용히
 * 막는다(그 경우 전역 동의 시트가 이미 화면을 덮고 있다).
 *
 * @returns 진입 직전 호출할 `requireLogin`과 `LoginRequiredSheet`에 그대로 넘길 props
 */
export function useLoginRequired() {
  const { isMember, isGuest } = useMemberAccess();
  const [isOpen, setIsOpen] = useState(false);

  const requireLogin = (event?: Preventable): boolean => {
    if (isMember) {
      return false;
    }

    event?.preventDefault();

    if (isGuest) {
      setIsOpen(true);
    }

    return true;
  };

  return {
    requireLogin,
    sheetProps: { open: isOpen, onOpenChange: setIsOpen },
  };
}
