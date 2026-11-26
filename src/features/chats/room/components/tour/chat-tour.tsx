'use client';

/**
 * @file 채팅 화면 안내 투어의 표시 컴포넌트.
 *
 * 투어는 여러 파일이 나눠 맡는다. 자동 노출 조건은 `shouldAutoOpenChatTour`, 노출 상태와 분석 이벤트는
 * `useChatTour`, 입력 모드별 스텝 목록은 `getChatTourSteps`, 하이라이트와 카드 배치 계산은 `tour-geometry` 가
 * 맡는다. 이 파일은 열린 투어의 측정, 정착 재측정, 카드 배치, 건너뛰기와 완료 호출을 담당한다.
 *
 * @see useChatTour
 * @see shouldAutoOpenChatTour
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { m } from 'motion/react';

import { Button } from '@/components/ui/button';
import { APP_FRAME_ID } from '@/constants/app-frame';
import { useBackLayer } from '@/hooks/use-back-layer';
import { cn } from '@/lib/utils';

import { type ChatInputMode } from '../../utils/chat-input-config';
import {
  isTourRectInViewport,
  padTourRect,
  resolveTourCardLeft,
  resolveTourCardSide,
  type TourBounds,
  type TourRect,
  unionTourRects,
} from '../../utils/tour-geometry';
import {
  type ChatTourStep,
  type ChatTourStepId,
  getChatTourSteps,
} from './tour-steps';

/** 하이라이트가 대상 영역 바깥으로 사방에 더 두는 여백(px). */
const HIGHLIGHT_PADDING = 6;
/** 하이라이트와 안내 카드 사이 간격(px). */
const CARD_GAP = 12;
/** 안내 카드가 프레임 좌우와 화면 위아래 경계에서 띄우는 최소 여백(px). */
const CARD_MARGIN = 16;
/** 안내 카드 너비(px). 카드 마크업의 `w-72` 와 같은 값이어야 가로 배치 계산이 맞는다. */
const CARD_WIDTH = 288;
/** 카드를 하이라이트 위와 아래 중 어디에 둘지 판정할 때만 쓰는 카드 높이 추정치(px). */
const CARD_HEIGHT_ESTIMATE = 160;

type ChatTourProps = {
  inputMode: ChatInputMode;
  /** 스텝이 보일 때 호출된다. `stepNumber` 는 이름과 달리 스텝 목록의 0부터 세는 인덱스다(건너뛴 스텝 포함). */
  onStepView: (stepNumber: number, stepId: ChatTourStepId) => void;
  /** 마지막 스텝에서 완료를 누르거나 보여줄 스텝이 하나도 없을 때 호출된다. */
  onComplete: () => void;
  /** 건너뛰기나 뒤로가기로 닫을 때 호출된다. `stepNumber` 는 `onStepView` 와 같은 0부터 세는 인덱스다. */
  onSkip: (stepNumber: number) => void;
};

type TourStepState = {
  /** 스텝 목록 안의 인덱스. */
  index: number;
  /** 대상 요소들의 화면 좌표 합집합. 재측정에서 대상이 사라지면 null이 되고 그동안 투어를 그리지 않는다. */
  rect: TourRect | null;
  /** 이후에 대상이 렌더된 스텝이 남았는지. false면 다음 버튼이 완료로 바뀐다. */
  hasNext: boolean;
};

/**
 * 카드를 가둘 가로 경계를 구한다.
 * 앱은 `max-w-md` 프레임 안에서만 그려지므로 넓은 화면에서는 뷰포트가 아니라
 * 프레임 좌우가 기준이다. 프레임을 찾지 못하면 뷰포트로 폴백한다.
 *
 * @returns 카드를 가둘 가로 경계
 */
function resolveFrameBounds(): TourBounds {
  const frame = document.getElementById(APP_FRAME_ID);

  if (frame === null) {
    return { left: 0, right: window.innerWidth };
  }

  const { left, right } = frame.getBoundingClientRect();

  return { left, right };
}

/**
 * 카드가 놓일 쪽에 남은 세로 공간을 구한다.
 * 문구 길이에 따라 카드가 얼마나 높아지든 화면 밖으로 밀려나지 않게 하는 상한이다.
 *
 * @param rect 여백을 더한 하이라이트 영역
 * @param side 카드가 놓일 쪽
 * @returns 카드의 최대 높이(px)
 */
function resolveCardMaxHeight(rect: TourRect, side: 'top' | 'bottom'): number {
  if (side === 'bottom') {
    return (
      window.innerHeight - (rect.top + rect.height + CARD_GAP) - CARD_MARGIN
    );
  }

  return rect.top - CARD_GAP - CARD_MARGIN;
}

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

/** 열린 직후 대상 등장 애니메이션이 끝날 때까지 프레임마다 재측정하는 시간(ms). */
const SETTLE_REMEASURE_MS = 1000;

/**
 * 두 하이라이트 사각형이 같은지 비교한다. 같으면 상태를 갱신하지 않아 프레임마다 다시
 * 그리지 않는다.
 *
 * @param a 이전 사각형
 * @param b 새 사각형
 * @returns 같으면 true
 */
function isSameRect(a: TourRect | null, b: TourRect | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }

  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
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

/**
 * 대상 요소를 딤 사이로 밝히고 옆에 안내 카드를 띄우는 채팅 화면 투어. 열려 있을 때만 마운트된다.
 *
 * @remarks
 * - 마운트 다음 프레임에 첫 스텝을 고른다. 보여줄 대상이 하나도 없으면 아무것도 그리지 않고 바로 `onComplete` 를 부른다.
 * - 열린 뒤 `SETTLE_REMEASURE_MS` 동안은 대상이 등장 애니메이션으로 움직이므로 프레임마다 다시 재고, 이후에는 창 크기 변경 때만 잰다.
 * - 뒤로가기는 건너뛰기와 같다.
 * - 딤과 카드는 body로 포털하고, 카드의 가로 위치만 앱 프레임 좌우 경계 안에 가둔다.
 */
export function ChatTour({
  inputMode,
  onStepView,
  onComplete,
  onSkip,
}: ChatTourProps) {
  const [step, setStep] = useState<TourStepState | null>(null);
  const hasStartedRef = useRef(false);
  const steps = getChatTourSteps(inputMode);

  // 뒤로가기는 건너뛰기와 같다(Android §71). 투어는 열려 있을 때만 마운트된다.
  useBackLayer({ open: true, onBack: () => onSkip(step?.index ?? 0) });

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
      setStep((prev) => {
        if (prev === null) {
          return prev;
        }

        const rect = measureStep(steps[prev.index].selectors);

        return isSameRect(prev.rect, rect) ? prev : { ...prev, rect };
      });

    // 화면이 준비되자마자 열리므로 추천 입력 등장 애니메이션 동안 대상이 아래로 밀린다.
    // 정착할 때까지 프레임마다 다시 재서 하이라이트가 대상을 따라가게 한다.
    const settleStart = performance.now();
    let frame = requestAnimationFrame(function tick() {
      remeasure();

      if (performance.now() - settleStart < SETTLE_REMEASURE_MS) {
        frame = requestAnimationFrame(tick);
      }
    });

    window.addEventListener('resize', remeasure);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', remeasure);
    };
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
  const cardLeft = resolveTourCardLeft(
    padded,
    CARD_WIDTH,
    resolveFrameBounds(),
    CARD_MARGIN,
  );
  const cardMaxHeight = resolveCardMaxHeight(padded, side);

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
        className="absolute flex w-72 flex-col gap-1 overflow-y-auto overscroll-contain rounded-md bg-background p-4 shadow-lg"
        style={
          side === 'bottom'
            ? {
                top: padded.top + padded.height + CARD_GAP,
                left: cardLeft,
                maxHeight: cardMaxHeight,
              }
            : {
                bottom: window.innerHeight - padded.top + CARD_GAP,
                left: cardLeft,
                maxHeight: cardMaxHeight,
              }
        }>
        <p className="font-semibold">{current.title}</p>
        <p className="text-sm text-foreground-secondary">
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
