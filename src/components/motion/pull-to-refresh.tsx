'use client';
// beui.dev/components/motion/pull-to-refresh

import {
  type ReactNode,
  type Ref,
  type UIEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  animate,
  AnimatePresence,
  m,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';

import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { EASE_IN_OUT, EASE_OUT, SPRING_PANEL, SPRING_SWAP } from '@/lib/ease';
import { TOUCH_GESTURE_CONTENT_CLASS } from '@/lib/touch';
import { cn } from '@/lib/utils';

export type PullToRefreshStatus = 'idle' | 'pulling' | 'ready' | 'refreshing';

/** 당겨서 새로고침 표시자의 정본 문구. E2E와 문서는 리터럴 대신 이 상수를 참조한다. */
export const PULL_TO_REFRESH_COPY = {
  pulling: '당겨서 새로고침',
  release: '놓으면 새로고침',
  refreshing: '새로고침 중',
  ariaLabel: '당겨서 새로고침할 수 있는 영역',
} as const;

export interface PullToRefreshProps {
  /** Runs after the user pulls beyond the threshold and releases. */
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
  /**
   * 콘텐츠 위에 두되 당김에 함께 밀리지 않는 영역이다. 표시자는 이 영역 바로 아래에 나타난다.
   * 스크롤러 안에 있으므로 sticky 같은 배치는 넘기는 쪽이 정한다.
   */
  header?: ReactNode;
  /** 스크롤러 요소 ref. 무한 스크롤의 교차 관찰 root처럼 바깥이 스크롤러를 알아야 할 때 쓴다. */
  ref?: Ref<HTMLElement>;
  /** 스크롤러의 scroll 이벤트. 헤더·FAB의 스크롤 상태 판정에 쓴다. */
  onScroll?: (event: UIEvent<HTMLElement>) => void;
  /** Keeps the indicator active while an externally managed refresh runs. */
  refreshing?: boolean;
  disabled?: boolean;
  /** Resisted pull distance in pixels required to refresh. */
  threshold?: number;
  /** Maximum resisted pull distance in pixels. */
  maxPull?: number;
  /** Content offset in pixels while refreshing. */
  holdDistance?: number;
  pullingLabel?: ReactNode;
  releaseLabel?: ReactNode;
  refreshingLabel?: ReactNode;
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  indicatorClassName?: string;
}

type Gesture = {
  active: boolean;
  startX: number;
  startY: number;
};

const EMPTY_GESTURE: Gesture = {
  active: false,
  startX: 0,
  startY: 0,
};

/**
 * 새로고침 중 마스코트가 살짝 뛰어올라 한 바퀴 돌고 내려앉는 한 주기다.
 * 주기 끝의 쉼(repeatDelay)은 회전이 끝난 자세라, 이 구간에서 멈추면 0도로 되돌려도 티가 나지 않는다.
 */
const JUMP_SPIN = {
  duration: 0.7,
  repeatDelay: 0.25,
  repeat: Number.POSITIVE_INFINITY,
} as const;
const CALM_PULSE = {
  duration: 1.2,
  ease: EASE_IN_OUT,
  repeat: Number.POSITIVE_INFINITY,
} as const;
const LABEL_SWAP = { duration: 0.16, ease: EASE_OUT } as const;

function resistedDistance(distance: number, maxPull: number) {
  return maxPull * (1 - Math.exp(-Math.max(0, distance) / maxPull));
}

/**
 * 새로고침 표시를 끝내기 전에 더 기다릴 시간(ms)을 반환한다.
 * 애니메이션을 최소 한 주기는 보여 주고, 주기 중간에 끊기지 않도록 다음 주기 경계까지 기다린다.
 */
export function remainingRefreshCycleMs(elapsedMs: number, cycleMs: number) {
  const cycles = Math.max(1, Math.ceil(elapsedMs / cycleMs));

  return cycles * cycleMs - elapsedMs;
}

/** 당김 진행에 맞춰 살아나고 새로고침 중에는 뛰어올라 한 바퀴 도는 마냑 심볼. */
function RefreshSymbol({
  progress,
  status,
  reduce,
}: {
  progress: MotionValue<number>;
  status: PullToRefreshStatus;
  reduce: boolean;
}) {
  const lift = useTransform(progress, [0, 1], [-7, 0]);
  const tilt = useTransform(progress, [0, 1], [-10, 0]);
  const stretch = useTransform(progress, [0, 0.55, 1], [0.68, 1.1, 0.92]);
  const ready = status === 'ready';
  const refreshing = status === 'refreshing';

  return (
    <m.span
      style={reduce ? undefined : { y: lift, rotate: tilt, scaleY: stretch }}
      className="block size-7 origin-bottom text-primary">
      <m.span
        className="block h-full w-full"
        animate={
          refreshing
            ? reduce
              ? { opacity: [0.55, 1, 0.55] }
              : { y: [0, -12, 0], rotate: [0, -360] }
            : reduce
              ? { opacity: 1 }
              : { y: 0, rotate: 0, scale: ready ? 1.08 : 1 }
        }
        transition={
          refreshing
            ? reduce
              ? CALM_PULSE
              : {
                  // 오를 때 감속하고 내려올 때 가속해 가볍게 튀는 느낌을 준다.
                  y: { ...JUMP_SPIN, ease: ['easeOut', 'easeIn'] },
                  rotate: { ...JUMP_SPIN, ease: EASE_IN_OUT },
                }
            : // 주기 경계에서 멈추므로 -360도와 0도는 같은 자세다. 되감기지 않게 회전은 즉시 되돌린다.
              { ...SPRING_SWAP, rotate: { duration: 0 } }
        }>
        <ManyakSymbolIcon aria-hidden="true" className="h-full w-full" />
      </m.span>
    </m.span>
  );
}

export function PullToRefresh({
  onRefresh,
  children,
  header,
  ref,
  onScroll,
  refreshing = false,
  disabled = false,
  threshold = 76,
  maxPull = 132,
  holdDistance = 68,
  pullingLabel = PULL_TO_REFRESH_COPY.pulling,
  releaseLabel = PULL_TO_REFRESH_COPY.release,
  refreshingLabel = PULL_TO_REFRESH_COPY.refreshing,
  ariaLabel = PULL_TO_REFRESH_COPY.ariaLabel,
  className,
  contentClassName,
  indicatorClassName,
}: PullToRefreshProps) {
  const rootRef = useRef<HTMLElement>(null);
  const gestureRef = useRef<Gesture>({ ...EMPTY_GESTURE });
  const animationRef = useRef<{ stop: () => void } | null>(null);
  const statusRef = useRef<PullToRefreshStatus>('idle');
  const disabledRef = useRef(disabled);
  const externalRefreshingRef = useRef(refreshing);
  const refreshingRef = useRef(refreshing);
  const [status, setStatusState] = useState<PullToRefreshStatus>('idle');
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const reduce = useReducedMotion();
  const pullThreshold = Math.max(24, threshold);
  const pullLimit = Math.max(maxPull, pullThreshold + 24);
  const restingDistance = Math.min(Math.max(0, holdDistance), pullThreshold);
  const y = useMotionValue(0);
  const progress = useTransform(y, [0, pullThreshold], [0, 1]);
  const indicatorOpacity = useTransform(
    y,
    [0, 10, pullThreshold],
    [0, 0.45, 1],
  );
  const indicatorScale = useTransform(y, [0, pullThreshold], [0.86, 1]);
  const isRefreshing = refreshing || internalRefreshing;

  useEffect(() => {
    disabledRef.current = disabled;
    externalRefreshingRef.current = refreshing;
    refreshingRef.current = isRefreshing;
  });

  const setStatus = (next: PullToRefreshStatus) => {
    if (statusRef.current === next) return;

    statusRef.current = next;
    setStatusState(next);
  };

  const settle = (target: number) => {
    animationRef.current?.stop();

    if (reduce) {
      y.set(target);

      return;
    }

    animationRef.current = animate(y, target, SPRING_PANEL);
  };

  const updatePull = (distance: number) => {
    if (disabledRef.current || refreshingRef.current) return;

    animationRef.current?.stop();

    const next = resistedDistance(distance, pullLimit);

    y.set(next);
    setStatus(next >= pullThreshold ? 'ready' : 'pulling');
  };

  const runRefresh = async () => {
    if (disabledRef.current || refreshingRef.current) return;

    setInternalRefreshing(true);
    setStatus('refreshing');
    settle(restingDistance);

    const startedAt = performance.now();

    try {
      await onRefresh();
    } finally {
      const cycleSeconds = reduce
        ? CALM_PULSE.duration
        : JUMP_SPIN.duration + JUMP_SPIN.repeatDelay;

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          remainingRefreshCycleMs(
            performance.now() - startedAt,
            cycleSeconds * 1000,
          ),
        ),
      );
      setInternalRefreshing(false);

      if (!externalRefreshingRef.current) {
        setStatus('idle');
        settle(0);
      }
    }
  };

  const finishPull = () => {
    const shouldRefresh =
      y.get() >= pullThreshold &&
      !disabledRef.current &&
      !refreshingRef.current;

    gestureRef.current = { ...EMPTY_GESTURE };

    if (shouldRefresh) {
      void runRefresh();

      return;
    }

    setStatus('idle');
    settle(0);
  };

  useEffect(() => {
    if (isRefreshing) {
      setStatus('refreshing');
      settle(restingDistance);

      return;
    }

    if (statusRef.current === 'refreshing') {
      setStatus('idle');
      settle(0);
    }
    // 상태 갱신 함수는 React Compiler가 메모하므로 refreshing 전환에만 반응한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshing, restingDistance]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    if (disabled) {
      gestureRef.current = { ...EMPTY_GESTURE };

      if (statusRef.current === 'pulling' || statusRef.current === 'ready') {
        setStatus('idle');
        settle(0);
      }

      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      if (
        event.touches.length !== 1 ||
        root.scrollTop > 0 ||
        disabledRef.current ||
        refreshingRef.current
      ) {
        return;
      }

      const touch = event.touches[0];

      gestureRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      const gesture = gestureRef.current;
      const touch = event.touches[0];

      if (!gesture.active || !touch) return;

      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      if (root.scrollTop > 0 || deltaY < 0) {
        gestureRef.current = { ...EMPTY_GESTURE };

        return;
      }

      if (Math.abs(deltaX) > deltaY) return;

      event.preventDefault();
      updatePull(deltaY);
    };

    const onTouchEnd = () => {
      if (gestureRef.current.active) finishPull();
    };

    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', onTouchEnd);
    root.addEventListener('touchcancel', onTouchEnd);

    return () => {
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 활성화 여부가 바뀔 때만 리스너를 연결한다.
  }, [disabled]);

  useEffect(() => {
    return () => animationRef.current?.stop();
  }, []);

  const label =
    status === 'refreshing'
      ? refreshingLabel
      : status === 'ready'
        ? releaseLabel
        : pullingLabel;

  return (
    <section
      ref={(element) => {
        rootRef.current = element;

        if (typeof ref === 'function') ref(element);
        else if (ref) ref.current = element;
      }}
      onScroll={onScroll}
      aria-label={ariaLabel}
      aria-busy={isRefreshing}
      data-state={status}
      data-disabled={disabled || undefined}
      className={cn(
        'relative flex w-full flex-col overflow-y-auto overscroll-contain bg-background',
        TOUCH_GESTURE_CONTENT_CLASS,
        (status === 'pulling' || status === 'ready') && 'select-none',
        className,
      )}>
      {header}

      {/* 표시자의 기준 상자다. 헤더 바로 아래에서 시작하므로 표시자가 헤더에 가려지지 않는다. */}
      <div className="relative flex flex-1 flex-col bg-inherit">
        <m.div
          aria-live="polite"
          aria-atomic="true"
          style={
            reduce
              ? { opacity: indicatorOpacity }
              : { opacity: indicatorOpacity, scale: indicatorScale }
          }
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 z-20 flex h-17 flex-col items-center justify-center gap-0.5 bg-linear-to-b from-background via-background/95 to-transparent text-[11px] font-medium text-muted-foreground',
            indicatorClassName,
          )}>
          <RefreshSymbol
            progress={progress}
            status={status}
            reduce={Boolean(reduce)}
          />
          <span className="relative h-4 min-w-24 text-center">
            <AnimatePresence initial={false} mode="wait">
              <m.span
                key={status}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 3 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -3 }}
                transition={LABEL_SWAP}
                className="absolute inset-x-0 whitespace-nowrap">
                {label}
              </m.span>
            </AnimatePresence>
          </span>
        </m.div>

        <m.div
          style={reduce ? undefined : { y }}
          className={cn(
            'relative z-10 flex-1 bg-inherit will-change-transform',
            contentClassName,
          )}>
          {children}
        </m.div>
      </div>
    </section>
  );
}
