import type { Variants } from 'motion/react';

/**
 * 초반에 빠르게 감속한 뒤 긴 꼬리로 잦아드는 커브. 멈추는 순간이 드러나지 않아
 * 등장과 화면 전환이 우아하게 느껴지므로 온보딩 전체의 리듬을 이 곡선 하나로 맞춘다.
 */
export const ONBOARDING_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 첫 화면 등장 순서(초). 이미지 카드가 먼저 깔리고 로고가 떠오른 뒤, 제목 두 줄이 소설
 * 도입부처럼 반 박자 간격으로 떠오르고 설명이 나타난다. 스크롤 신호는 읽을 거리가 다
 * 놓인 다음 박자에 마지막으로 나타난다.
 */
export const ONBOARDING_ENTRANCE_DELAY = {
  logo: 0.15,
  titleFirstLine: 0.3,
  titleSecondLine: 0.55,
  description: 0.8,
  scrollCue: 1.15,
} as const;

/** 첫 화면 이미지 한 장이 머무는 시간과 다음 장으로 넘어가는 시간(ms). Android 로그인과 같다. */
export const ONBOARDING_HERO_HOLD_MS = 4000;
export const ONBOARDING_HERO_FADE_MS = 1200;

/**
 * `custom`으로 받은 지연(초) 뒤에 아래에서 떠오르는 등장 variants를 만든다.
 * 모션 감소 설정이면 위치와 블러 없이 투명도만 바꾼다.
 *
 * @param prefersReducedMotion 모션 감소 설정 여부
 * @returns `hidden`, `show` 두 상태를 갖는 variants
 */
export function createRiseVariants(
  prefersReducedMotion: boolean | null,
): Variants {
  return {
    hidden: {
      opacity: 0,
      ...(prefersReducedMotion ? {} : { y: 18, filter: 'blur(5px)' }),
    },
    show: (delay: number) => ({
      opacity: 1,
      ...(prefersReducedMotion ? {} : { y: 0, filter: 'blur(0px)' }),
      transition: { delay, duration: 0.7, ease: ONBOARDING_EASE },
    }),
  };
}
