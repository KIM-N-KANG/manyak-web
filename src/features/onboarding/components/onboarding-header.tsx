'use client';

import { type RefObject } from 'react';

import { m, useScroll, useTransform } from 'motion/react';

import { ManyakLogo } from '@/components/layout/manyak-logo';

const HEADER_REVEAL_END = 0.95;

interface OnboardingHeaderProps {
  scrollerRef: RefObject<HTMLElement | null>;
  heroRef: RefObject<HTMLElement | null>;
  onLogoClick: () => void;
}

export function OnboardingHeader({
  scrollerRef,
  heroRef,
  onLogoClick,
}: OnboardingHeaderProps) {
  const { scrollYProgress } = useScroll({
    container: scrollerRef,
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const opacity = useTransform(scrollYProgress, (progress) =>
    Math.min(progress / HEADER_REVEAL_END, 1),
  );
  const visibility = useTransform(opacity, (value) =>
    value > 0 ? 'visible' : 'hidden',
  );

  return (
    <m.header
      style={{ opacity, visibility }}
      className="absolute inset-x-0 top-0 z-20 flex h-(--onboarding-header-height) items-center bg-background px-4">
      <button type="button" aria-label="맨 위로 이동" onClick={onLogoClick}>
        <ManyakLogo className="h-6 w-auto text-primary" />
      </button>
    </m.header>
  );
}
