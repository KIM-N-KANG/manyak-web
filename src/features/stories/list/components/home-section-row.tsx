'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { useMainScroll } from '@/components/layout/main-scroll-context';
import { Button } from '@/components/ui/button';
import { StoryCard } from '@/features/stories/_shared/components/story-card';
import { STORY_LIST_COPY } from '@/features/stories/_shared/constants/story-list';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import { useInView } from '@/hooks/use-in-view';
import { cn } from '@/lib/utils';

/**
 * 한 화면에 보이는 카드 수. 카드 너비 클래스와 함께 바꾼다.
 * 두 장과 그 사이 8px이 좌우 16px 여백 안을 채운다. 넘길 카드가 있으면 카드 사이를 16px로 배치하고
 * 두 번째 칸에 들어오는 카드만 8px 당겨(`home-section-card`) 처음, 끝과 화살표로 넘긴 자리에서 양옆 카드가 화면 밖에 있게 한다.
 */
const CARDS_PER_VIEW = 2;

/** 보이는 카드 뒤로 표지를 미리 받아 두는 카드 수. 넘길 때 표지가 한 장씩 늦게 나타나지 않게 한다. */
const PREFETCH_CARD_COUNT = 2;

/** 세로 스크롤 영역 밖 이 거리 안에 들어온 줄부터 표지를 받는다. 스크롤 영역 높이의 절반이다. */
const ROW_PREFETCH_MARGIN = '50% 0px';

type HomeSectionRowProps = {
  name: string;
  stories: StoryListItem[];
  /** 첫 섹션이면 앞 카드의 표지를 먼저 받는다. */
  isFirst: boolean;
};

export function HomeSectionRow({
  name,
  stories,
  isFirst,
}: HomeSectionRowProps) {
  const titleId = useId();
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const scrollTargetRef = useRef<number | null>(null);
  const dragScrollProps = useDragScroll();
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  const hasMore = stories.length > CARDS_PER_VIEW;
  const { scrollContainer } = useMainScroll();
  const [sectionElement, setSectionElement] = useState<HTMLElement | null>(
    null,
  );
  // 표지를 받을 앞쪽 카드 수. 넘겨서 보인 카드가 늘면 그 뒤 두 장까지 늘리고 줄이지 않는다.
  const [coverLoadCount, setCoverLoadCount] = useState(
    CARDS_PER_VIEW + PREFETCH_CARD_COUNT,
  );
  // 브라우저 기본 지연 로딩은 화면 밖 먼 거리의 표지까지 미리 받는다. 줄이 세로 스크롤 영역 근처에
  // 들어왔을 때만 보이는 카드와 다음 두 장의 표지를 받는다.
  const isRowNear = useInView({
    target: sectionElement,
    root: scrollContainer,
    enabled: scrollContainer !== null,
    rootMargin: ROW_PREFETCH_MARGIN,
    initialInView: false,
  });

  useEffect(() => {
    const list = listRef.current;

    if (!list || !hasMore) return;

    const updateEdges = () => {
      if (
        scrollTargetRef.current !== null &&
        Math.abs(list.scrollLeft - scrollTargetRef.current) < 1
      ) {
        scrollTargetRef.current = null;
      }

      setEdges({
        atStart: list.scrollLeft <= 1,
        atEnd: list.scrollLeft + list.clientWidth >= list.scrollWidth - 1,
      });

      const card = list.firstElementChild;

      if (!card) return;

      const { columnGap, paddingLeft, paddingRight } = getComputedStyle(list);
      const step = card.getBoundingClientRect().width + parseFloat(columnGap);
      // 여백 안쪽까지 들어온 카드만 보인 것으로 센다. 여백에 걸친 조각은 페이드가 지운다.
      const visibleWidth =
        list.scrollLeft +
        list.clientWidth -
        parseFloat(paddingLeft) -
        parseFloat(paddingRight);
      // 카드 경계에 딱 맞은 위치에서 소수점 오차로 다음 카드를 보인 것으로 세지 않게 조금 덜어 낸다.
      const visibleCount = Math.ceil(visibleWidth / step - 0.01);

      setCoverLoadCount((count) =>
        Math.max(count, visibleCount + PREFETCH_CARD_COUNT),
      );
    };
    const observer = new ResizeObserver(updateEdges);

    observer.observe(list);
    list.addEventListener('scroll', updateEdges, { passive: true });

    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', updateEdges);
    };
  }, [hasMore]);

  const moveByCard = (direction: -1 | 1) => {
    const list = listRef.current;

    if (!list) return;

    const card = list.firstElementChild;

    if (!card) return;

    const step =
      card.getBoundingClientRect().width +
      parseFloat(getComputedStyle(list).columnGap);
    const maxScrollLeft = list.scrollWidth - list.clientWidth;
    const from = scrollTargetRef.current ?? list.scrollLeft;
    const target = Math.min(
      maxScrollLeft,
      Math.max(0, (Math.round(from / step) + direction) * step),
    );
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    scrollTargetRef.current = target;
    list.scrollTo({
      left: target,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section
      ref={setSectionElement}
      aria-labelledby={titleId}
      className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 px-4">
        <h2
          id={titleId}
          className="min-w-0 truncate text-xl leading-7 font-semibold">
          {name}
        </h2>
        {hasMore ? (
          <div className="flex shrink-0 items-center gap-1">
            <SectionArrowButton
              icon={ArrowLeft01Icon}
              label={STORY_LIST_COPY.prevLabel}
              controls={listId}
              disabled={edges.atStart}
              onClick={() => moveByCard(-1)}
            />
            <SectionArrowButton
              icon={ArrowRight01Icon}
              label={STORY_LIST_COPY.nextLabel}
              controls={listId}
              disabled={edges.atEnd}
              onClick={() => moveByCard(1)}
            />
          </div>
        ) : null}
      </div>
      <ul
        {...dragScrollProps}
        ref={listRef}
        id={listId}
        data-drag-scrollable=""
        className={cn(
          'scrollbar-none flex overflow-x-auto overscroll-x-contain',
          // 넘기는 동안 여백 16px에 걸친 가장자리 카드를 바깥으로 옅게 지운다. 오른쪽 여백 8px은 마지막 카드의 당김 8px과 합쳐 16px이 된다.
          hasMore
            ? 'scroll-fade-x gap-4 pr-2 pl-4 [--scroll-fade-size:--spacing(4)]'
            : 'gap-2 px-4',
        )}>
        {stories.map((story, index) => (
          <li
            key={story.id}
            className={cn(
              'shrink-0',
              hasMore
                ? 'w-[calc((100%-1rem)/2)] home-section-card'
                : 'w-[calc((100%-0.5rem)/2)]',
            )}>
            <StoryCard
              story={story}
              position={index}
              section="original"
              priority={isFirst && index < CARDS_PER_VIEW}
              loadCover={isRowNear && index < coverLoadCount}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

type SectionArrowButtonProps = {
  icon: typeof ArrowLeft01Icon;
  label: string;
  controls: string;
  disabled: boolean;
  onClick: () => void;
};

function SectionArrowButton({
  icon,
  label,
  controls,
  disabled,
  onClick,
}: SectionArrowButtonProps) {
  return (
    <Button
      variant="secondary"
      aria-label={label}
      aria-controls={controls}
      disabled={disabled}
      onClick={onClick}
      className="size-7 rounded-full p-0 text-foreground disabled:opacity-40">
      <HugeiconsIcon
        icon={icon}
        className="size-4"
        strokeWidth={2}
        aria-hidden="true"
      />
    </Button>
  );
}
