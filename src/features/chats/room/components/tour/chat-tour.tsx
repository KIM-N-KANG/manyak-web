'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { m } from 'motion/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { type ChatInputMode } from '../../utils/chat-input-config';
import {
  clampTourCardLeft,
  isTourRectInViewport,
  padTourRect,
  resolveTourCardSide,
  type TourRect,
  unionTourRects,
} from '../../utils/tour-geometry';
import {
  type ChatTourStep,
  type ChatTourStepId,
  getChatTourSteps,
} from './tour-steps';

const HIGHLIGHT_PADDING = 6;
const CARD_GAP = 12;
const CARD_MARGIN = 16;
const CARD_WIDTH = 288;
const CARD_HEIGHT_ESTIMATE = 160;

type ChatTourProps = {
  inputMode: ChatInputMode;
  onStepView: (stepNumber: number, stepId: ChatTourStepId) => void;
  onComplete: () => void;
  onSkip: (stepNumber: number) => void;
};

type TourStepState = {
  index: number;
  rect: TourRect | null;
  hasNext: boolean;
};

/**
 * 스텝 대상 요소들의 화면 좌표 합집합을 구한다.
 *
 * @param selectors 대상 요소의 data-tour 셀렉터 목록
 * @returns 합집합 영역. 렌더된 대상이 없으면 null
 */
function measureStep(selectors: string[]): TourRect | null {
  const rects = selectors
    .flatMap((selector) =>
      Array.from(document.querySelectorAll<HTMLElement>(selector)),
    )
    .filter((element) => element.getClientRects().length > 0)
    .map((element) => {
      const { top, left, width, height } = element.getBoundingClientRect();

      return { top, left, width, height };
    });

  return unionTourRects(rects);
}

/**
 * 지정 인덱스 이후에 렌더된 대상이 남아 있는지 확인한다.
 *
 * @param steps 전체 스텝 목록
 * @param from 탐색을 시작할 스텝 인덱스
 * @returns 대상이 있는 스텝이 남아 있으면 true
 */
function hasStepFrom(steps: ChatTourStep[], from: number): boolean {
  return steps.slice(from).some((step) => measureStep(step.selectors) !== null);
}

/**
 * 지정 인덱스부터 실제로 보여줄 수 있는 스텝의 상태를 계산한다.
 * 대상이 없거나 화면 밖인 스텝은 건너뛴다.
 *
 * @param steps 전체 스텝 목록
 * @param from 탐색을 시작할 스텝 인덱스
 * @returns 표시할 스텝 상태. 남은 스텝이 없으면 null
 */
function resolveStepState(
  steps: ChatTourStep[],
  from: number,
): TourStepState | null {
  for (let index = from; index < steps.length; index += 1) {
    const rect = measureStep(steps[index].selectors);

    if (rect !== null && isTourRectInViewport(rect, window.innerHeight)) {
      return { index, rect, hasNext: hasStepFrom(steps, index + 1) };
    }
  }

  return null;
}

export function ChatTour({
  inputMode,
  onStepView,
  onComplete,
  onSkip,
}: ChatTourProps) {
  const [step, setStep] = useState<TourStepState | null>(null);
  const hasStartedRef = useRef(false);
  const steps = getChatTourSteps(inputMode);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      hasStartedRef.current = true;

      const next = resolveStepState(steps, 0);

      if (next === null) {
        onComplete();

        return;
      }

      setStep(next);
      onStepView(next.index, steps[next.index].id);
    });

    return () => cancelAnimationFrame(frame);
  }, [onComplete, onStepView, steps]);

  useEffect(() => {
    const remeasure = () =>
      setStep((prev) =>
        prev === null
          ? prev
          : { ...prev, rect: measureStep(steps[prev.index].selectors) },
      );

    window.addEventListener('resize', remeasure);

    return () => window.removeEventListener('resize', remeasure);
  }, [steps]);

  const goToStep = (from: number) => {
    const next = resolveStepState(steps, from);

    if (next === null) {
      onComplete();

      return;
    }

    setStep(next);
    onStepView(next.index, steps[next.index].id);
  };

  if (step === null || step.rect === null) {
    return null;
  }

  const current = steps[step.index];
  const padded = padTourRect(step.rect, HIGHLIGHT_PADDING);
  const side = resolveTourCardSide(
    padded,
    window.innerHeight,
    CARD_HEIGHT_ESTIMATE,
    CARD_GAP,
  );
  const cardLeft = clampTourCardLeft(
    padded.left + padded.width / 2,
    CARD_WIDTH,
    window.innerWidth,
    CARD_MARGIN,
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="채팅 화면 안내"
      className="fixed inset-0 z-60">
      <m.div
        className="absolute rounded-md shadow-[0_0_0_200vmax_rgba(0,0,0,0.5)]"
        initial={false}
        animate={{
          top: padded.top,
          left: padded.left,
          width: padded.width,
          height: padded.height,
        }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
      <m.div
        key={current.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="absolute flex w-72 flex-col gap-1 rounded-md bg-background p-4 shadow-lg"
        style={
          side === 'bottom'
            ? { top: padded.top + padded.height + CARD_GAP, left: cardLeft }
            : {
                bottom: window.innerHeight - padded.top + CARD_GAP,
                left: cardLeft,
              }
        }>
        <p className="font-semibold">{current.title}</p>
        <p className="text-sm break-keep text-foreground-secondary">
          {current.description}
        </p>
        <div className="mt-3 flex items-center gap-1">
          {steps.map((tourStep, index) => (
            <span
              key={tourStep.id}
              className={cn(
                'size-1.5 rounded-full',
                index === step.index ? 'bg-foreground-secondary' : 'bg-border',
              )}
            />
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSkip(step.index)}>
              건너뛰기
            </Button>
            <Button
              type="button"
              size="sm"
              autoFocus
              onClick={() => goToStep(step.index + 1)}>
              {step.hasNext ? '다음' : '완료'}
            </Button>
          </div>
        </div>
      </m.div>
    </div>,
    document.body,
  );
}
