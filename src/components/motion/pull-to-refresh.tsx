'use client';
// beui.dev/components/motion/pull-to-refresh

import {
  type PointerEvent as ReactPointerEvent,
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
import { capturePointer, TOUCH_GESTURE_CONTENT_CLASS } from '@/lib/touch';
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
  pointerId: number | null;
};

const EMPTY_GESTURE: Gesture = {
  active: false,
  startX: 0,
  startY: 0,
  pointerId: null,
};

// This character needs a compact repeating rhythm rather than a settling
// spring: a small orbit and blink that read as activity without feeling busy.
const CHARACTER_LOOP = {
  duration: 0.9,
  ease: EASE_IN_OUT,
  repeat: Number.POSITIVE_INFINITY,
} as const;
const CALM_PULSE = {
  duration: 1.2,
  ease: EASE_IN_OUT,
  repeat: Number.POSITIVE_INFINITY,
} as const;
const LABEL_SWAP = { duration: 0.16, ease: EASE_OUT } as const;
/** 마우스·펜 경로에서 이 거리(px)만큼 아래로 움직여야 당김으로 본다. 그 전에는 클릭이다. */
const POINTER_PULL_SLOP = 6;

function resistedDistance(distance: number, maxPull: number) {
  return maxPull * (1 - Math.exp(-Math.max(0, distance) / maxPull));
}

/** 당김 진행에 맞춰 살아나고 새로고침 중에는 까딱이는 마냑 심볼. */
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
              : { y: [0, -2, 0], rotate: [-8, 8, -8] }
            : reduce
              ? { opacity: 1 }
              : { y: 0, rotate: 0, scale: ready ? 1.08 : 1 }
        }
        transition={
          refreshing ? (reduce ? CALM_PULSE : CHARACTER_LOOP) : SPRING_SWAP
        }>
        <ManyakSymbolIcon aria-hidden="true" className="h-full w-full" />
      </m.span>
    </m.span>
  );
}

export function PullToRefresh({
  onRefresh,
  children,
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

  // 네이티브 터치 리스너가 최신 prop을 읽도록 ref에 비춘다. 렌더 중 대입은 React 규칙 위반이라 커밋 뒤에 쓴다.
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

    try {
      await onRefresh();
    } finally {
      setInternalRefreshing(false);

      // A synchronous refresh can resolve before React commits the temporary
      // internal state, so release here instead of relying only on the effect.
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
        pointerId: null,
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
    // 제스처 처리 함수는 React Compiler가 메모하므로 마운트 시 한 번만 붙인다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => animationRef.current?.stop();
  }, []);

  const startPointerPull = (event: ReactPointerEvent<HTMLElement>) => {
    // Everything but touch: a finger is driven by the native listeners above,
    // which can `preventDefault` the page scroll a passive React handler
    // cannot. A pen fires no touch events at all, so this is its only route.
    if (
      event.pointerType === 'touch' ||
      event.button !== 0 ||
      event.currentTarget.scrollTop > 0 ||
      disabled ||
      isRefreshing
    ) {
      return;
    }

    // 여기서 포인터를 캡처하지 않는다. pointerdown마다 캡처하면 pointerup·click이 이 요소로
    // 향해 안의 링크·버튼 클릭이 전부 삼켜진다. 캡처는 아래로 당기는 움직임이 확인된 뒤에 건다.
    gestureRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
    };
  };

  const movePointerPull = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;

    if (!gesture.active || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    // 위로·옆으로 움직이면 당김이 아니다. 제스처를 접어 이후 클릭이 방해받지 않게 한다.
    if (deltaY < 0 || Math.abs(deltaX) > deltaY) {
      gestureRef.current = { ...EMPTY_GESTURE };

      return;
    }

    if (deltaY < POINTER_PULL_SLOP) return;

    capturePointer(event.currentTarget, event.pointerId);
    event.preventDefault();
    updatePull(deltaY);
  };

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
      onPointerDown={startPointerPull}
      onPointerMove={movePointerPull}
      onPointerUp={(event) => {
        if (gestureRef.current.pointerId === event.pointerId) finishPull();
      }}
      onPointerCancel={(event) => {
        if (gestureRef.current.pointerId === event.pointerId) finishPull();
      }}
      className={cn(
        'relative w-full overflow-y-auto overscroll-contain bg-background',
        // No `touch-none` here — this element is the scroller, and the pull
        // only takes over once the content is already at the top. The callout
        // has to be off from the first frame though: iOS decides on it while
        // the finger is still resting, long before the pull is recognised.
        // Whatever the consumer renders inside stays selectable with a mouse;
        // only the pull itself suppresses selection, and only while it runs,
        // so dragging the page down cannot highlight it on the way.
        TOUCH_GESTURE_CONTENT_CLASS,
        status === 'pulling' || status === 'ready'
          ? 'cursor-grabbing select-none'
          : 'cursor-grab',
        (disabled || isRefreshing) && 'cursor-default',
        className,
      )}>
      <m.div
        aria-live="polite"
        aria-atomic="true"
        style={
          reduce
            ? { opacity: indicatorOpacity }
            : { opacity: indicatorOpacity, scale: indicatorScale }
        }
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[4.25rem] flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-background via-background/95 to-transparent text-[11px] font-medium text-muted-foreground',
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
          'relative z-10 min-h-full bg-inherit will-change-transform',
          contentClassName,
        )}>
        {children}
      </m.div>
    </section>
  );
}
