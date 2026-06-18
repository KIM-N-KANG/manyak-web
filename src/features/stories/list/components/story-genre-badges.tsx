'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Badge } from '@/components/ui/badge';

type StoryGenreBadgesProps = {
  genres: string[];
};

const GAP_PX = 4;

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function StoryGenreBadges({ genres }: StoryGenreBadgesProps) {
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
    <div ref={containerRef} className="relative flex gap-1 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none invisible absolute -z-10 flex">
        <div ref={genreMeasureRef} className="flex w-max gap-1">
          {genres.map((genre) => (
            <GenreBadge key={genre} genre={genre} />
          ))}
        </div>
        <span ref={overflowMeasureRef} className="w-max">
          <OverflowBadge count={88} />
        </span>
      </div>

      {genres.slice(0, visibleCount).map((genre) => (
        <GenreBadge key={genre} genre={genre} />
      ))}
      {hiddenCount > 0 && <OverflowBadge count={hiddenCount} />}
    </div>
  );
}

function GenreBadge({ genre }: { genre: string }) {
  return (
    <Badge variant="secondary" className="text-foreground-secondary">
      {genre}
    </Badge>
  );
}

function OverflowBadge({ count }: { count: number }) {
  return (
    <Badge variant="secondary" className="text-foreground-secondary">
      <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
      {count}
    </Badge>
  );
}
