'use client';

import { useEffect, useState } from 'react';

/**
 * 스크롤하면 자동으로 닫히는 오버레이(팝오버 등)의 open 상태 훅.
 * 스크롤 이벤트는 버블링되지 않으므로 캡처 단계에서 감지한다.
 *
 * @returns open 상태와 이를 변경하는 setter의 튜플
 */
export function useDismissOnScroll() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const close = () => setOpen(false);

    window.addEventListener('scroll', close, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', close, { capture: true });
    };
  }, [open]);

  return [open, setOpen] as const;
}
