'use client';

import { AnimatePresence, m } from 'motion/react';

import { FADE_TRANSITION_PROPS } from '@/lib/motion';

type FadeStateSwitchProps = {
  /** 바뀌면 이전 내용을 페이드아웃한 뒤 새 내용을 페이드인한다. */
  stateKey: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * 로딩, 오류, 본문처럼 서로 바뀌는 상태 화면을 교차 페이드로 전환한다.
 * 처음 마운트할 때는 애니메이션 없이 바로 보인다.
 */
export function FadeStateSwitch({
  stateKey,
  className,
  children,
}: FadeStateSwitchProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div key={stateKey} className={className} {...FADE_TRANSITION_PROPS}>
        {children}
      </m.div>
    </AnimatePresence>
  );
}
