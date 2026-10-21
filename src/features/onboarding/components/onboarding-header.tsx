'use client';

import { type RefObject } from 'react';

import { m, useScroll, useTransform } from 'motion/react';

import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';

import {
  ONBOARDING_HEADER_BROWSE_LABEL,
  ONBOARDING_HEADER_CREATE_LABEL,
} from '../constants';

const HEADER_REVEAL_END = 0.95;

interface OnboardingHeaderProps {
  scrollerRef: RefObject<HTMLElement | null>;
  heroRef: RefObject<HTMLElement | null>;
  onLogoClick: () => void;
  onStartCreate: () => void;
  onBrowse: () => void;
}

export function OnboardingHeader({
  scrollerRef,
  heroRef,
  onLogoClick,
  onStartCreate,
  onBrowse,
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
      className="absolute inset-x-0 top-0 z-20 flex h-(--onboarding-header-height) items-center justify-between bg-background px-4">
      <button type="button" aria-label="맨 위로 이동" onClick={onLogoClick}>
        <ManyakLogo className="h-6 w-auto text-primary" />
      </button>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onBrowse}>
          {ONBOARDING_HEADER_BROWSE_LABEL}
        </Button>
        <Button type="button" size="sm" onClick={onStartCreate}>
          {ONBOARDING_HEADER_CREATE_LABEL}
        </Button>
      </div>
    </m.header>
  );
}
