'use client';

import { useReducedMotion } from 'motion/react';
import Image from 'next/image';

import { AspectRatio } from '@/components/ui/aspect-ratio';

const PREVIEW_POSTER = '/onboarding/onboarding-preview.jpg';
const PREVIEW_LABEL =
  '키워드를 고르고 스토리라인을 선택해 스토리를 만드는 과정';

export function OnboardingPreview() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4 pb-6">
      <AspectRatio
        ratio={3 / 4}
        className="h-full max-w-full overflow-hidden rounded-xl border border-border bg-muted">
        {prefersReducedMotion ? (
          <Image
            src={PREVIEW_POSTER}
            alt={PREVIEW_LABEL}
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-contain"
          />
        ) : (
          <video
            className="h-full w-full object-contain"
            poster={PREVIEW_POSTER}
            aria-label={PREVIEW_LABEL}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata">
            <source src="/onboarding/onboarding-preview.mp4" type="video/mp4" />
            <source
              src="/onboarding/onboarding-preview.webm"
              type="video/webm"
            />
          </video>
        )}
      </AspectRatio>
    </div>
  );
}
