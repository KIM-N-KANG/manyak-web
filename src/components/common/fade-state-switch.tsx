'use client';

import { AnimatePresence, m } from 'motion/react';

import { FADE_TRANSITION_PROPS } from '@/lib/motion';

type FadeStateSwitchProps = {
  stateKey: string;
  className?: string;
  children: React.ReactNode;
};

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
