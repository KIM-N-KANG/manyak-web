'use client';

import { useReducedMotion } from 'motion/react';
import Image from 'next/image';

const PREVIEW_POSTER = '/onboarding/onboarding-preview.jpg';
const PREVIEW_LABEL =
  '키워드를 고르고 스토리라인을 선택해 스토리를 만드는 과정';
const PREVIEW_WIDTH = 1080;
const PREVIEW_HEIGHT = 1440;
const PREVIEW_CLASS =
  'h-auto max-h-full w-auto max-w-full rounded-xl border border-border';

export function OnboardingPreview() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4 pb-6">
      {prefersReducedMotion ? (
        <Image
          src={PREVIEW_POSTER}
          alt={PREVIEW_LABEL}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          sizes="(max-width: 448px) 100vw, 448px"
          className={PREVIEW_CLASS}
        />
      ) : (
        <video
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          className={PREVIEW_CLASS}
          poster={PREVIEW_POSTER}
          aria-label={PREVIEW_LABEL}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata">
          <source src="/onboarding/onboarding-preview.mp4" type="video/mp4" />
          <source src="/onboarding/onboarding-preview.webm" type="video/webm" />
        </video>
      )}
    </div>
  );
}
