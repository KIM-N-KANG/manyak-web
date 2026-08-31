'use client';

import { useRef, useState } from 'react';

import { m, useReducedMotion, type Variants } from 'motion/react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

import {
  ONBOARDING_CLOSING_LINE,
  ONBOARDING_SECTIONS,
  type OnboardingScene,
} from '../constants';

// 원본 스크린샷(1082×2402)을 810px 폭으로 줄인 비율을 유지한 크기.
// 실제 렌더 폭(카드 82% ≈ 340px, DPR 3 기준 ≈ 1020px)을 웃돌지 않게 810으로 맞춘다.
const SCENE_WIDTH = 810;
const SCENE_HEIGHT = 1798;

const SCENE_IMAGE_CLASS = 'w-full rounded-2xl border border-border';
const SCENE_IMAGE_SIZES = '(max-width: 448px) 82vw, 340px';
const DETAIL_IMAGE_SIZES = '(max-width: 448px) 87vw, 362px';

// 초반에 빠르게 감속한 뒤 긴 꼬리로 잦아드는 커브. 히어로 등장과 같은
// 곡선을 써서 페이지 전체의 리듬을 하나로 맞춘다.
const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

// 첫 화면에 걸치는 첫 섹션이 히어로(제목·설명) 등장을 앞지르지 않도록
// 히어로 시퀀스가 잦아든 뒤 이어받는 시점(초).
const FIRST_SECTION_DELAY = 0.8;

function SceneCard({
  scene,
  detailVariants,
}: {
  scene: OnboardingScene;
  detailVariants: Variants;
}) {
  return (
    <div className="relative">
      <Image
        src={scene.src}
        alt={scene.alt}
        width={scene.width ?? SCENE_WIDTH}
        height={scene.height ?? SCENE_HEIGHT}
        sizes={SCENE_IMAGE_SIZES}
        className={SCENE_IMAGE_CLASS}
      />
      {scene.detail && (
        <m.div
          variants={detailVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="absolute inset-x-[-3%] bottom-[2%] origin-bottom">
          <Image
            src={scene.detail.src}
            alt=""
            width={scene.detail.width}
            height={scene.detail.height}
            sizes={DETAIL_IMAGE_SIZES}
            className="w-full rounded-xl border border-border shadow-lg"
          />
        </m.div>
      )}
    </div>
  );
}

interface OnboardingSceneStripProps {
  scenes: readonly OnboardingScene[];
  variants: Variants;
  detailVariants: Variants;
}

function OnboardingSceneStrip({
  scenes,
  variants,
  detailVariants,
}: OnboardingSceneStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const resolveCards = () => {
    const scroller = scrollerRef.current;

    return scroller
      ? { scroller, cards: [...scroller.children] as HTMLElement[] }
      : null;
  };

  const handleScroll = () => {
    const resolved = resolveCards();

    if (!resolved || resolved.cards.length === 0) {
      return;
    }

    const { scroller, cards } = resolved;
    const alignedLeft = scroller.scrollLeft + cards[0].offsetLeft;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - alignedLeft);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  };

  const handleIndicatorClick = (index: number) => {
    const resolved = resolveCards();
    const card = resolved?.cards[index];

    if (!resolved || !card) {
      return;
    }

    resolved.scroller.scrollTo({
      left: card.offsetLeft - resolved.cards[0].offsetLeft,
      behavior: 'smooth',
    });
  };

  const hasDetail = scenes.some((scene) => scene.detail);

  return (
    <m.div variants={variants} className="flex flex-col gap-3">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className={cn(
          '-mx-4 -my-2 scrollbar-none flex snap-x snap-mandatory scroll-px-4 overflow-x-auto overscroll-x-contain px-4 py-2',
          hasDetail ? 'gap-8' : 'gap-3',
        )}>
        {scenes.map((scene) => (
          <div key={scene.src} className="w-[82%] shrink-0 snap-start">
            <SceneCard scene={scene} detailVariants={detailVariants} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center">
        {scenes.map((scene, index) => (
          <button
            key={scene.src}
            type="button"
            aria-label={`${index + 1}번째 화면 보기`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => handleIndicatorClick(index)}
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
    </m.div>
  );
}

export function OnboardingLanding() {
  const prefersReducedMotion = useReducedMotion();

  const reveal: Variants = {
    hidden: {
      opacity: 0,
      ...(prefersReducedMotion ? {} : { y: 22, filter: 'blur(4px)' }),
    },
    show: {
      opacity: 1,
      ...(prefersReducedMotion ? {} : { y: 0, filter: 'blur(0px)' }),
      transition: { duration: 0.6, ease: REVEAL_EASE },
    },
  };

  const sceneReveal: Variants = {
    hidden: {
      opacity: 0,
      ...(prefersReducedMotion ? {} : { y: 26, scale: 0.97 }),
    },
    show: {
      opacity: 1,
      ...(prefersReducedMotion ? {} : { y: 0, scale: 1 }),
      transition: { duration: 0.7, ease: REVEAL_EASE },
    },
  };

  const detailReveal: Variants = {
    hidden: {
      opacity: 0,
      ...(prefersReducedMotion ? {} : { scale: 0.9 }),
    },
    show: {
      opacity: 1,
      ...(prefersReducedMotion ? {} : { scale: 1 }),
      transition: { delay: 0.4, duration: 0.55, ease: REVEAL_EASE },
    },
  };

  const group: Variants = {
    hidden: {},
    show: (delayChildren: number) => ({
      transition: { staggerChildren: 0.14, delayChildren },
    }),
  };

  return (
    <div className="flex flex-col gap-16 px-4 py-8">
      {ONBOARDING_SECTIONS.map((section, index) => (
        <m.section
          key={section.key}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={group}
          custom={index === 0 ? FIRST_SECTION_DELAY : 0}
          className="flex flex-col gap-5">
          <m.header variants={reveal} className="flex flex-col gap-1.5">
            <p className="flex items-baseline gap-2 text-sm font-semibold text-primary">
              <span className="tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{section.eyebrow}</span>
            </p>
            <h2 className="text-lg font-bold text-balance">{section.title}</h2>
            <p className="text-pretty text-foreground-secondary">
              {section.description}
            </p>
          </m.header>
          {section.scenes.length === 1 ? (
            <m.div variants={sceneReveal} className="w-[82%] self-center">
              <SceneCard
                scene={section.scenes[0]}
                detailVariants={detailReveal}
              />
            </m.div>
          ) : (
            <OnboardingSceneStrip
              scenes={section.scenes}
              variants={sceneReveal}
              detailVariants={detailReveal}
            />
          )}
        </m.section>
      ))}
      <m.p
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={reveal}
        className="pt-2 text-center font-maruburi text-lg text-balance">
        {ONBOARDING_CLOSING_LINE}
      </m.p>
    </div>
  );
}
