'use client';

import { type CSSProperties, type RefObject, useRef, useState } from 'react';

import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  m,
  type MotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  ONBOARDING_GENRE_KEYWORDS,
  ONBOARDING_SCREEN_HEIGHT,
  ONBOARDING_SCREEN_WIDTH,
  type OnboardingFeature as OnboardingFeatureData,
  type OnboardingFeatureAction,
  type OnboardingSlide,
} from '../constants';
import {
  type GalleryMotion,
  getGalleryPosition,
  getSlideMotionStyle,
} from '../utils/onboarding-gallery';
import { createRiseVariants } from '../utils/onboarding-motion';

const SLIDE_SCROLL_LENGTH_CQH = 80;
const SLIDE_WIDTH =
  'min(80cqi, calc((100cqh - var(--onboarding-header-height) - 18rem) * 0.75))';
const SLIDE_GAP = '3cqi';
const SLIDE_CAPTION_HEIGHT = '7.5rem';
const SLIDE_TOP_ROOM = '2.5rem';
const SLIDE_IMAGE_SIZES = '(max-width: 448px) 66vw, 300px';

const GENRE_CLOUD_LAYOUT = [
  { x: 12, y: 58, className: 'text-[0.8125rem] text-foreground-tertiary/70' },
  { x: 30, y: 22, className: 'text-[0.9375rem] text-foreground-tertiary' },
  { x: 56, y: 12, className: 'text-[1.0625rem] text-foreground-secondary' },
  { x: 82, y: 30, className: 'text-[0.8125rem] text-foreground-tertiary/70' },
  { x: 20, y: 86, className: 'text-[0.8125rem] text-foreground-tertiary' },
  { x: 48, y: 46, className: 'text-[1.0625rem] text-foreground-secondary' },
  { x: 78, y: 62, className: 'text-[0.9375rem] text-foreground-tertiary' },
  { x: 90, y: 88, className: 'text-[0.8125rem] text-foreground-tertiary/70' },
  { x: 8, y: 20, className: 'text-[0.8125rem] text-foreground-tertiary/70' },
  { x: 36, y: 70, className: 'text-[0.9375rem] text-foreground-tertiary' },
  { x: 62, y: 84, className: 'text-[0.9375rem] text-foreground-secondary' },
  { x: 92, y: 8, className: 'text-[0.8125rem] text-foreground-tertiary/70' },
] as const;

interface GallerySlideProps {
  slide: OnboardingSlide;
  index: number;
  slideCount: number;
  motion: GalleryMotion;
  position: MotionValue<number>;
  isCurrent: boolean;
  isNext: boolean;
}

function GallerySlide({
  slide,
  index,
  slideCount,
  motion,
  position,
  isCurrent,
  isNext,
}: GallerySlideProps) {
  const style = useTransform(position, (value) =>
    getSlideMotionStyle(motion, index - value),
  );
  const transform = useTransform(style, ({ transform }) => transform);
  const opacity = useTransform(style, ({ opacity }) => opacity);
  const captionOpacity = useTransform(
    style,
    ({ captionOpacity }) => captionOpacity,
  );
  const zIndex =
    motion === 'deck'
      ? slideCount - index
      : motion === 'stack'
        ? index
        : undefined;

  return (
    <m.li
      aria-current={isCurrent ? 'step' : undefined}
      style={{ transform, opacity, zIndex }}
      className="absolute top-(--slide-top-room) left-1/2 h-(--slide-height) w-(--slide-width) origin-top">
      <div
        className={cn(
          'relative aspect-3/4 overflow-hidden rounded-[1.75rem] bg-muted',
          motion !== 'gallery' &&
            'shadow-[0_16px_40px_-20px_rgb(0_0_0/0.35)] ring-1 ring-foreground/5',
        )}>
        <div className="absolute inset-x-[10%] top-[8%] bottom-0 overflow-hidden rounded-t-[1.125rem] bg-background shadow-[0_12px_32px_-16px_rgb(0_0_0/0.35)] ring-1 ring-foreground/5">
          {[slide.src, slide.darkSrc].map((src) => (
            <Image
              key={src}
              src={src}
              alt={slide.alt}
              width={ONBOARDING_SCREEN_WIDTH}
              height={ONBOARDING_SCREEN_HEIGHT}
              sizes={SLIDE_IMAGE_SIZES}
              loading={motion === 'stack' && isNext ? 'eager' : 'lazy'}
              draggable={false}
              style={{
                transform: `translateY(-${(slide.cropTop / ONBOARDING_SCREEN_HEIGHT) * 100}%)`,
              }}
              className={cn(
                'h-auto w-full select-none',
                src === slide.src ? 'dark:hidden' : 'hidden dark:block',
              )}
            />
          ))}
        </div>
      </div>
      <m.div style={{ opacity: captionOpacity }} className="px-1">
        <h3 className="mt-5 text-lg font-bold tracking-[-0.02em]">
          {slide.title}
        </h3>
        <p className="mt-1 text-[0.9375rem] leading-normal text-balance text-foreground-secondary">
          {slide.description}
        </p>
      </m.div>
    </m.li>
  );
}

interface FeatureActionButtonProps {
  action: OnboardingFeatureAction;
  onClick: () => void;
}

function FeatureActionButton({ action, onClick }: FeatureActionButtonProps) {
  const isCreate = action.type === 'create';

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'group/action h-12 gap-3 rounded-full pr-1.5 pl-5 text-[0.9375rem] font-semibold',
        isCreate
          ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:bg-primary/20 dark:hover:bg-primary/25'
          : 'bg-muted text-foreground hover:bg-secondary',
      )}>
      {action.label}
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-full transition-transform duration-300 ease-out group-hover/action:translate-x-0.5',
          isCreate
            ? 'bg-primary text-primary-foreground'
            : 'bg-foreground text-background',
        )}>
        <HugeiconsIcon
          icon={ArrowRight02Icon}
          strokeWidth={2.2}
          className="size-4.5"
          aria-hidden="true"
        />
      </span>
    </Button>
  );
}

interface OnboardingFeatureProps {
  feature: OnboardingFeatureData;
  scrollerRef: RefObject<HTMLElement | null>;
  onAction: () => void;
  showGenreCloud?: boolean;
}

export function OnboardingFeature({
  feature,
  scrollerRef,
  onAction,
  showGenreCloud = false,
}: OnboardingFeatureProps) {
  const galleryRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const rise = createRiseVariants(prefersReducedMotion);
  const slideCount = feature.slides.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const { scrollYProgress } = useScroll({
    container: scrollerRef,
    target: galleryRef,
    offset: ['start start', 'end end'],
  });
  const position = useTransform(scrollYProgress, (progress) =>
    getGalleryPosition(progress, slideCount),
  );

  useMotionValueEvent(position, 'change', (value) => {
    setCurrentIndex(Math.round(value));
  });

  return (
    <>
      <m.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        className={cn(
          'flex flex-col items-center px-6 text-center',
          showGenreCloud ? 'pt-24' : 'pt-12',
        )}>
        {showGenreCloud && (
          <ul aria-hidden="true" className="relative mb-6 h-40 w-full">
            {GENRE_CLOUD_LAYOUT.map((word, index) => (
              <m.li
                key={ONBOARDING_GENRE_KEYWORDS[index]}
                variants={rise}
                custom={index * 0.04}
                style={{ left: `${word.x}%`, top: `${word.y}%` }}
                className={cn(
                  'absolute -translate-1/2 font-medium whitespace-nowrap',
                  word.className,
                )}>
                {ONBOARDING_GENRE_KEYWORDS[index]}
              </m.li>
            ))}
          </ul>
        )}
        <m.p
          variants={rise}
          custom={showGenreCloud ? 0.4 : 0}
          className="text-[0.9375rem] font-semibold text-primary">
          {feature.label}
        </m.p>
        <h2 className="mt-3 text-[1.75rem] leading-[1.35] font-bold tracking-[-0.03em]">
          {feature.titleLines.map((titleLine, index) => (
            <m.span
              key={titleLine}
              variants={rise}
              custom={(showGenreCloud ? 0.5 : 0.1) + index * 0.12}
              className="block">
              {titleLine}
            </m.span>
          ))}
        </h2>
        {feature.description && (
          <m.p
            variants={rise}
            custom={showGenreCloud ? 0.8 : 0.4}
            className="mt-4 text-base leading-relaxed text-balance text-foreground-secondary">
            {feature.description}
          </m.p>
        )}
      </m.div>

      <section
        ref={galleryRef}
        aria-label={feature.label}
        style={{
          height: `calc(100cqh - var(--onboarding-header-height) + ${(slideCount - 1) * SLIDE_SCROLL_LENGTH_CQH}cqh)`,
        }}>
        <div className="sticky top-(--onboarding-header-height) flex h-[calc(100cqh-var(--onboarding-header-height))] min-h-[30rem] flex-col justify-center gap-5 overflow-hidden">
          <ol
            style={
              {
                '--slide-width': SLIDE_WIDTH,
                '--slide-gap': SLIDE_GAP,
                '--slide-top-room': SLIDE_TOP_ROOM,
                '--slide-height': `calc(var(--slide-width) * 4 / 3 + ${SLIDE_CAPTION_HEIGHT})`,
                height: `calc(var(--slide-height) + ${SLIDE_TOP_ROOM})`,
              } as CSSProperties
            }
            className="relative shrink-0 overflow-hidden">
            {feature.slides.map((slide, index) => (
              <GallerySlide
                key={slide.key}
                slide={slide}
                index={index}
                slideCount={slideCount}
                motion={feature.motion}
                position={position}
                isCurrent={index === currentIndex}
                isNext={index === currentIndex + 1}
              />
            ))}
          </ol>
          {slideCount > 1 && (
            <div aria-hidden="true" className="flex justify-center gap-1.5">
              {feature.slides.map((slide, index) => (
                <span
                  key={slide.key}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === currentIndex
                      ? 'w-4 bg-foreground'
                      : 'w-1.5 bg-foreground-tertiary/50',
                  )}
                />
              ))}
            </div>
          )}
          <div className="flex justify-center pt-1">
            <FeatureActionButton action={feature.action} onClick={onAction} />
          </div>
        </div>
      </section>
    </>
  );
}
