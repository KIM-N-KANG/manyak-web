'use client';

import { useEffect, useState } from 'react';

import { useReducedMotion } from 'motion/react';
import Image from 'next/image';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

const PREVIEW_WIDTH = 1080;
const PREVIEW_HEIGHT = 1440;
const PREVIEW_CLASS =
  'h-auto max-h-full w-auto max-w-full rounded-xl border border-border';

/** 온보딩에서 보여줄 미리보기 슬라이드 목록. 스토리 제작 → 채팅 순서다. */
const PREVIEW_SLIDES = [
  {
    key: 'story',
    label: '키워드를 고르고 스토리라인을 선택해 스토리를 만드는 과정',
    poster: '/onboarding/onboarding-story-preview.jpg',
    webm: '/onboarding/onboarding-story-preview.webm',
    mp4: '/onboarding/onboarding-story-preview.mp4',
  },
  {
    key: 'chat',
    label:
      '완성한 스토리 속 주인공이 되어 상황과 대사를 입력하며 대화하는 과정',
    poster: '/onboarding/onboarding-chat-preview.jpg',
    webm: '/onboarding/onboarding-chat-preview.webm',
    mp4: '/onboarding/onboarding-chat-preview.mp4',
  },
] as const;

export function OnboardingPreview() {
  const prefersReducedMotion = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    const handleSelect = () => {
      setActiveIndex(api.selectedScrollSnap());
    };

    api.on('select', handleSelect);

    return () => {
      api.off('select', handleSelect);
    };
  }, [api]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 p-4 pb-6">
      <Carousel setApi={setApi} className="min-h-0 w-full flex-1">
        <CarouselContent containerClassName="h-full" className="h-full">
          {PREVIEW_SLIDES.map((slide) => (
            <CarouselItem
              key={slide.key}
              className="flex items-center justify-center">
              {prefersReducedMotion ? (
                <Image
                  src={slide.poster}
                  alt={slide.label}
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
                  poster={slide.poster}
                  aria-label={slide.label}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata">
                  {/* VP9(webm)가 mp4보다 작아 지원 브라우저에 먼저 물린다. 사파리 등 미지원 환경은 mp4로 폴백한다. */}
                  <source src={slide.webm} type="video/webm" />
                  <source src={slide.mp4} type="video/mp4" />
                </video>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="flex shrink-0 items-center">
        {PREVIEW_SLIDES.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            aria-label={`${index + 1}번째 미리보기 보기`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => api?.scrollTo(index)}
            className="flex size-6 items-center justify-center">
            <span
              className={cn(
                'size-1.5 rounded-full bg-border transition-colors',
                index === activeIndex && 'bg-foreground-secondary',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
