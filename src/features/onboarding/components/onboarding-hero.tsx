'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

import { m, useReducedMotion, useScroll, useTransform } from 'motion/react';
import Image from 'next/image';

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

interface HeroSlide {
  current: number;
  previous: number | null;
}

interface OnboardingHeroProps {
  scrollerRef: RefObject<HTMLElement | null>;
}

export function OnboardingHero({ scrollerRef }: OnboardingHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
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
          <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-3 px-6 pb-10 text-white">
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
        </m.div>
      </div>
    </section>
  );
}
