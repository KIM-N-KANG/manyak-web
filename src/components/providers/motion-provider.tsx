'use client';

import { domMax, LazyMotion } from 'motion/react';

/**
 * motion 기능을 `domMax` 번들로 지연 로드하는 Provider. `strict`라서 하위에서는 `motion.*` 대신 `m.*`
 * 컴포넌트만 써야 하고, `motion.*`을 렌더하면 오류가 난다.
 */
function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}

export { MotionProvider };
