'use client';

import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from 'motion/react';
import Image from 'next/image';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

// 실제 렌더 폭은 Pixel 5(DPR 2.75)에서 841px, iPhone 13(DPR 3)에서 776px이라
// 원본을 810px로 맞춘다. 더 키워도 화면에 쓰이지 않고 전송량만 늘어난다.
const PREVIEW_WIDTH = 810;
const PREVIEW_HEIGHT = 1080;
const PREVIEW_CLASS =
  'h-auto max-h-full w-auto max-w-full rounded-xl border border-border';

/** 온보딩에서 보여줄 미리보기 슬라이드 목록. 스토리 제작 → 채팅 순서다. */
const PREVIEW_SLIDES = [
  {
    key: 'story',
    label: '키워드를 고르고 스토리라인을 선택해 스토리를 만드는 과정',
    poster: '/onboarding/onboarding-story-preview.webp',
    webm: '/onboarding/onboarding-story-preview.webm',
    mp4: '/onboarding/onboarding-story-preview.mp4',
  },
  {
    key: 'chat',
    label:
      '완성한 스토리 속 주인공이 되어 상황과 대사를 입력하며 대화하는 과정',
    poster: '/onboarding/onboarding-chat-preview.webp',
    webm: '/onboarding/onboarding-chat-preview.webm',
    mp4: '/onboarding/onboarding-chat-preview.mp4',
  },
] as const;

/**
 * 슬라이드 영상 재생을 시도한다.
 * 자동재생이 막힌 환경에서는 거부되며, 이때는 포스터가 그대로 남는다.
 *
 * @param video 재생할 video 엘리먼트
 */
function playPreview(video: HTMLVideoElement) {
  void video.play().catch(() => undefined);
}

export function OnboardingPreview() {
  const prefersReducedMotion = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedIndexes, setLoadedIndexes] = useState<readonly number[]>([0]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    if (!api) {
      return;
    }

    const handleSelect = () => {
      const index = api.selectedScrollSnap();

      setActiveIndex(index);
      setLoadedIndexes((indexes) =>
        indexes.includes(index) ? indexes : [...indexes, index],
      );
    };

    api.on('select', handleSelect);

    return () => {
      api.off('select', handleSelect);
    };
  }, [api]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) {
        return;
      }

      if (index === activeIndex) {
        playPreview(video);
      } else {
        video.pause();
      }
    });
  }, [activeIndex]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 p-4 pb-6">
      <Carousel setApi={setApi} className="min-h-0 w-full flex-1">
        <CarouselContent containerClassName="h-full" className="h-full">
          {PREVIEW_SLIDES.map((slide, index) => (
            <CarouselItem
              key={slide.key}
              className="flex items-center justify-center">
              {prefersReducedMotion ? (
                <Image
                  src={slide.poster}
                  alt={slide.label}
                  width={PREVIEW_WIDTH}
                  height={PREVIEW_HEIGHT}
                  sizes="(max-width: 448px) calc(100vw - 32px), 416px"
                  priority={index === 0}
                  className={PREVIEW_CLASS}
                />
              ) : (
                <video
                  ref={(element) => {
                    videoRefs.current[index] = element;
                  }}
                  width={PREVIEW_WIDTH}
                  height={PREVIEW_HEIGHT}
                  className={PREVIEW_CLASS}
                  poster={
                    loadedIndexes.includes(index) ? slide.poster : undefined
                  }
                  aria-label={slide.label}
                  autoPlay={index === 0}
                  muted
                  loop
                  playsInline
                  preload={loadedIndexes.includes(index) ? 'auto' : 'none'}>
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
