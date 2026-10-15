'use client';

import { type RefObject, useEffect, useState } from 'react';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  m,
  type Transition,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import Image from 'next/image';

import { ManyakLogo } from '@/components/layout/manyak-logo';
import { cn } from '@/lib/utils';

import {
  ONBOARDING_DESCRIPTION,
  ONBOARDING_HERO_IMAGES,
  ONBOARDING_TITLE_LINES,
} from '../constants';
import {
  createRiseVariants,
  ONBOARDING_ENTRANCE_DELAY,
  ONBOARDING_HERO_FADE_MS,
  ONBOARDING_HERO_HOLD_MS,
} from '../utils/onboarding-motion';

const TITLE_LINE_DELAYS = [
  ONBOARDING_ENTRANCE_DELAY.titleFirstLine,
  ONBOARDING_ENTRANCE_DELAY.titleSecondLine,
] as const;

/** 스크롤 신호가 완전히 사라지는 첫 화면 스크롤 진행률. 카드가 넓어지기 시작하면 바로 물러난다. */
const SCROLL_CUE_FADE_END = 0.15;

/**
 * 스크롤 신호가 아래로 내려가며 옅어졌다 돌아오는 호흡. 등장이 끝난 뒤 시작하고, 튀는
 * 바운스 대신 숨 쉬듯 쉬어 가며 반복해 이미지 감상을 방해하지 않는다.
 */
const SCROLL_CUE_BREATH: Transition = {
  delay: ONBOARDING_ENTRANCE_DELAY.scrollCue + 0.7,
  duration: 1.6,
  ease: 'easeInOut',
  repeat: Infinity,
  repeatDelay: 0.6,
};

interface HeroSlide {
  current: number;
  previous: number | null;
}

interface OnboardingHeroProps {
  scrollerRef: RefObject<HTMLElement | null>;
  sectionRef: RefObject<HTMLElement | null>;
}

export function OnboardingHero({
  scrollerRef,
  sectionRef,
}: OnboardingHeroProps) {
  const prefersReducedMotion = useReducedMotion();
  const rise = createRiseVariants(prefersReducedMotion);
  const [slide, setSlide] = useState<HeroSlide>({ current: 0, previous: null });
  const { scrollYProgress } = useScroll({
    container: scrollerRef,
    target: sectionRef,
    offset: ['start start', 'end end'],
  });
  const cardInset = useTransform(scrollYProgress, [0, 1], [32, 0]);
  const cardRadius = useTransform(scrollYProgress, [0, 1], [28, 0]);
  const cueOpacity = useTransform(scrollYProgress, (progress) =>
    Math.max(1 - progress / SCROLL_CUE_FADE_END, 0),
  );
  const cueVisibility = useTransform(cueOpacity, (value) =>
    value > 0 ? 'visible' : 'hidden',
  );

  useEffect(() => {
    if (prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setSlide(({ current }) => ({
        current: (current + 1) % ONBOARDING_HERO_IMAGES.length,
        previous: current,
      }));
    }, ONBOARDING_HERO_HOLD_MS + ONBOARDING_HERO_FADE_MS);

    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  const handleScrollDown = () => {
    scrollerRef.current?.scrollTo({
      top: sectionRef.current?.offsetHeight ?? 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section ref={sectionRef} className="relative h-[130cqh]">
      <div className="sticky top-0 h-[100cqh] min-h-[30rem]">
        <m.div
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { duration: 0.8 } },
          }}
          style={{
            top: cardInset,
            left: cardInset,
            right: cardInset,
            bottom: cardInset,
            borderRadius: cardRadius,
          }}
          className="absolute overflow-hidden bg-black">
          {ONBOARDING_HERO_IMAGES.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt=""
              fill
              priority={index === 0}
              sizes="(max-width: 448px) 100vw, 448px"
              style={{ transitionDuration: `${ONBOARDING_HERO_FADE_MS}ms` }}
              className={cn(
                'object-cover transition-opacity ease-linear',
                index === slide.current && 'z-10 opacity-100',
                index === slide.previous && 'opacity-100',
                index !== slide.current &&
                  index !== slide.previous &&
                  'opacity-0',
              )}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 z-20 h-3/5 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-3 px-6 pb-14 text-white">
            <m.div
              variants={rise}
              custom={ONBOARDING_ENTRANCE_DELAY.logo}
              className="mb-1">
              <ManyakLogo className="h-6 w-auto text-primary" />
            </m.div>
            <h1 className="text-[clamp(1.25rem,calc((100cqi-7rem)/10.4),2.25rem)] leading-[1.3] font-bold tracking-[-0.03em]">
              {ONBOARDING_TITLE_LINES.map((titleLine, index) => (
                <m.span
                  key={titleLine}
                  variants={rise}
                  custom={TITLE_LINE_DELAYS[index]}
                  className="block">
                  {titleLine}
                </m.span>
              ))}
            </h1>
            <m.p
              variants={rise}
              custom={ONBOARDING_ENTRANCE_DELAY.description}
              className="text-[clamp(0.8125rem,calc((100cqi-7rem)/20),1rem)] text-white/80">
              {ONBOARDING_DESCRIPTION}
            </m.p>
          </div>
          <m.div
            style={{ opacity: cueOpacity, visibility: cueVisibility }}
            className="absolute inset-x-0 bottom-1 z-40 flex justify-center">
            <m.button
              type="button"
              aria-label="아래로 이동"
              onClick={handleScrollDown}
              variants={rise}
              custom={ONBOARDING_ENTRANCE_DELAY.scrollCue}
              className="flex size-11 items-center justify-center text-white/80">
              <m.span
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { y: [0, 6, 0], opacity: [1, 0.4, 1] }
                }
                transition={SCROLL_CUE_BREATH}
                className="flex">
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={1.75}
                  className="size-6"
                />
              </m.span>
            </m.button>
          </m.div>
        </m.div>
      </div>
    </section>
  );
}
