'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type GenreBadgeSize = 'md' | 'sm' | 'xs';

type GenreBadgeTone = 'default' | 'inverse';

type StoryGenreBadgesProps = {
  /** 한 줄에 들어가는 만큼 보이고 나머지는 "+N"으로 줄인다. 한 장르가 줄보다 길면 "+N" 자리를 남기고 말줄임한다. */
  genres: string[];
  /**
   * 배지 크기. 홈 카드처럼 좁은 자리에서는 작은 배지(12px)를, 탐색 타일에서는 더 작은 배지(11px)를 쓴다.
   *
   * @default 'md'
   */
  size?: GenreBadgeSize;
  /**
   * 배지 색. 검은 바탕 위에서는 반투명 흰 배지(inverse)를 쓴다.
   *
   * @default 'default'
   */
  tone?: GenreBadgeTone;
};

const BADGE_SIZE_CLASS: Record<GenreBadgeSize, string> = {
  md: 'h-7 px-3 py-1 text-sm',
  sm: 'h-5 px-2 py-0 text-xs',
  xs: 'h-4.5 px-1.5 py-0 text-[11px]',
};

const BADGE_TONE_CLASS: Record<GenreBadgeTone, string> = {
  default: 'text-foreground-secondary',
  inverse: 'bg-white/15 text-white/80',
};

/** 배지 사이 간격(px). 컨테이너의 `gap-1`(4px)과 같아야 한 줄 개수 계산이 맞는다. */
const GAP_PX = 4;

/** 서버 렌더링에서는 `useLayoutEffect` 경고를 피해 `useEffect`로 대신한다. */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * 장르 배지를 한 줄에 들어가는 만큼만 보이고 나머지는 "+N"으로 줄이는 목록.
 *
 * @remarks
 * 보이지 않는 측정 레이어에 모든 배지와 두 자리 "+N" 배지를 그려 너비를 잰다. 다 들어가면 모두 보이고, 넘치면
 * "+N" 자리를 남긴 채 앞에서부터 들어가는 만큼 보인다. 첫 배지가 줄보다 길어도 최소 한 개는 보인다. 컨테이너
 * 크기가 바뀌면 다시 잰다.
 */
export function StoryGenreBadges({
  genres,
  size = 'md',
  tone = 'default',
}: StoryGenreBadgesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const genreMeasureRef = useRef<HTMLDivElement>(null);
  const overflowMeasureRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(genres.length);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const genreMeasure = genreMeasureRef.current;

    if (!container || !genreMeasure) return;

    const recompute = () => {
      const containerWidth = container.clientWidth;
      const widths = Array.from(genreMeasure.children).map(
        (el) => (el as HTMLElement).offsetWidth,
      );

      const totalWidth = widths.reduce(
        (sum, width, index) => sum + width + (index > 0 ? GAP_PX : 0),
        0,
      );

      if (totalWidth <= containerWidth) {
        setVisibleCount(genres.length);

        return;
      }

      const overflowWidth = overflowMeasureRef.current?.offsetWidth ?? 0;
      let used = 0;
      let count = 0;

      for (let index = 0; index < widths.length; index += 1) {
        const candidate = used + widths[index] + (index > 0 ? GAP_PX : 0);

        if (candidate + GAP_PX + overflowWidth > containerWidth) break;

        used = candidate;
        count += 1;
      }

      setVisibleCount(Math.max(count, 1));
    };

    recompute();

    const observer = new ResizeObserver(recompute);

    observer.observe(container);

    return () => observer.disconnect();
  }, [genres]);

  const hiddenCount = genres.length - visibleCount;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none relative flex gap-1 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none invisible absolute -z-10 flex">
        <div ref={genreMeasureRef} className="flex w-max gap-1">
          {genres.map((genre) => (
            <GenreBadge key={genre} genre={genre} size={size} tone={tone} />
          ))}
        </div>
        <span ref={overflowMeasureRef} className="w-max">
          <OverflowBadge count={88} size={size} tone={tone} />
        </span>
      </div>

      {genres.slice(0, visibleCount).map((genre) => (
        <GenreBadge key={genre} genre={genre} size={size} tone={tone} />
      ))}
      {hiddenCount > 0 && (
        <OverflowBadge count={hiddenCount} size={size} tone={tone} />
      )}
    </div>
  );
}

type BadgeStyleProps = { size: GenreBadgeSize; tone: GenreBadgeTone };

function GenreBadge({
  genre,
  size,
  tone,
}: BadgeStyleProps & { genre: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'min-w-0 shrink border-0',
        BADGE_SIZE_CLASS[size],
        BADGE_TONE_CLASS[tone],
      )}>
      <span className="truncate">{genre}</span>
    </Badge>
  );
}

function OverflowBadge({
  count,
  size,
  tone,
}: BadgeStyleProps & { count: number }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'border-0',
        BADGE_SIZE_CLASS[size],
        BADGE_TONE_CLASS[tone],
      )}>
      +{count}
    </Badge>
  );
}
