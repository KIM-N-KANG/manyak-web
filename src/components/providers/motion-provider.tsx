'use client';

import { domMax, LazyMotion } from 'motion/react';

function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}

export { MotionProvider };
