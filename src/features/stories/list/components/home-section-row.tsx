'use client';

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

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
 * 처음 화면에 걸치는 카드 수. 카드 너비 클래스와 함께 바꾼다.
 * 카드 폭은 (줄 폭 - 40px) / 2다. 왼쪽 여백 16px 뒤로 두 장과 셋째 카드의 앞 8px, 그 사이 8px 둘이 줄 폭을 채운다.
 * 카드 시작점을 왼쪽 여백에 맞춰 넘긴 자리에서는 앞 카드도 8px이 남아 양옆에 같은 폭이 보인다.
 */
const INITIAL_VISIBLE_CARD_COUNT = 3;

/** 넘김 버튼을 한 번 누를 때 넘기는 카드 수. 온전히 보이는 두 장이 모두 바뀐다. */
const CARDS_PER_MOVE = 2;

/** 보이는 카드 뒤로 표지를 미리 받아 두는 카드 수. 넘길 때 표지가 한 장씩 늦게 나타나지 않게 한다. */
const PREFETCH_CARD_COUNT = 2;

/** 세로 스크롤 영역 밖 이 거리 안에 들어온 줄부터 표지를 받는다. 스크롤 영역 높이의 절반이다. */
const ROW_PREFETCH_MARGIN = '50% 0px';

type MoveDirection = 'prev' | 'next';

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
  // 넘김 버튼으로 가는 중인 스크롤 위치. 넘기는 중에 다시 누르면 여기서 한 번 더 넘긴다.
  const scrollTargetRef = useRef<number | null>(null);
  const dragScrollProps = useDragScroll();
  const { scrollContainer } = useMainScroll();
  const [sectionElement, setSectionElement] = useState<HTMLElement | null>(
    null,
  );
  const [canMovePrev, setCanMovePrev] = useState(false);
  const [canMoveNext, setCanMoveNext] = useState(false);
  // 마우스가 올라간 쪽. 그쪽으로 넘기는 버튼만 보인다.
  const [hoveredSide, setHoveredSide] = useState<MoveDirection | null>(null);
  // 표지를 받을 앞쪽 카드 수. 넘겨서 보인 카드가 늘면 그 뒤 두 장까지 늘리고 줄이지 않는다.
  const [coverLoadCount, setCoverLoadCount] = useState(
    INITIAL_VISIBLE_CARD_COUNT + PREFETCH_CARD_COUNT,
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

    if (!list) return;

    const syncScrollState = () => {
      if (
        scrollTargetRef.current !== null &&
        Math.abs(list.scrollLeft - scrollTargetRef.current) < 1
      ) {
        scrollTargetRef.current = null;
      }

      setCanMovePrev(list.scrollLeft > 1);
      setCanMoveNext(list.scrollLeft + list.clientWidth < list.scrollWidth - 1);

      const card = list.firstElementChild;

      if (!card) return;

      const { columnGap, paddingLeft } = getComputedStyle(list);
      const step = card.getBoundingClientRect().width + parseFloat(columnGap);
      // 줄의 오른쪽 끝에 일부만 걸친 카드도 보인 것으로 센다.
      const visibleWidth =
        list.scrollLeft + list.clientWidth - parseFloat(paddingLeft);
      // 카드 경계에 딱 맞은 위치에서 소수점 오차로 다음 카드를 보인 것으로 세지 않게 조금 덜어 낸다.
      const visibleCount = Math.ceil(visibleWidth / step - 0.01);

      setCoverLoadCount((count) =>
        Math.max(count, visibleCount + PREFETCH_CARD_COUNT),
      );
    };
    // 사용자가 줄을 직접 움직이면 버튼의 목적지를 버린다.
    const clearScrollTarget = () => {
      scrollTargetRef.current = null;
    };
    const observer = new ResizeObserver(syncScrollState);
    // 목록을 다시 받아 카드 수가 바뀌면 줄 크기는 그대로라 크기 관찰로는 알 수 없다.
    const cardObserver = new MutationObserver(syncScrollState);

    observer.observe(list);
    cardObserver.observe(list, { childList: true });
    list.addEventListener('scroll', syncScrollState, { passive: true });
    list.addEventListener('pointerdown', clearScrollTarget);
    list.addEventListener('wheel', clearScrollTarget, { passive: true });

    return () => {
      observer.disconnect();
      cardObserver.disconnect();
      list.removeEventListener('scroll', syncScrollState);
      list.removeEventListener('pointerdown', clearScrollTarget);
      list.removeEventListener('wheel', clearScrollTarget);
    };
  }, []);

  const moveCards = (direction: MoveDirection) => {
    const list = listRef.current;
    const card = list?.firstElementChild;

    if (!list || !card) return;

    const step =
      card.getBoundingClientRect().width +
      parseFloat(getComputedStyle(list).columnGap);
    const from = scrollTargetRef.current ?? list.scrollLeft;
    // 카드 시작점이 왼쪽 여백에 맞는 자리로 넘긴다.
    const target = Math.min(
      list.scrollWidth - list.clientWidth,
      Math.max(
        0,
        (Math.round(from / step) +
          (direction === 'next' ? CARDS_PER_MOVE : -CARDS_PER_MOVE)) *
          step,
      ),
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

  // 터치와 펜은 손으로 넘기므로 마우스에만 버튼을 보인다.
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;

    const { left, width } = event.currentTarget.getBoundingClientRect();

    setHoveredSide(event.clientX < left + width / 2 ? 'prev' : 'next');
  };

  return (
    <section
      ref={setSectionElement}
      aria-labelledby={titleId}
      className="flex flex-col gap-3">
      <h2
        id={titleId}
        className="truncate px-4 text-xl leading-7 font-semibold">
        {name}
      </h2>
      {/* 넘김 버튼의 세로 위치를 줄 폭에서 계산하도록 컨테이너로 둔다. */}
      <div
        className="@container relative"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredSide(null)}>
        <ul
          {...dragScrollProps}
          ref={listRef}
          id={listId}
          data-drag-scrollable=""
          className="scrollbar-none flex gap-2 overflow-x-auto overscroll-x-contain px-4">
          {stories.map((story, index) => (
            <li key={story.id} className="w-[calc((100%-0.5rem)/2)] shrink-0">
              <StoryCard
                story={story}
                position={index}
                section="original"
                priority={isFirst && index < INITIAL_VISIBLE_CARD_COUNT}
                loadCover={isRowNear && index < coverLoadCount}
              />
            </li>
          ))}
        </ul>
        <SectionMoveButton
          direction="prev"
          controls={listId}
          enabled={canMovePrev}
          hovered={hoveredSide === 'prev'}
          onClick={() => moveCards('prev')}
        />
        <SectionMoveButton
          direction="next"
          controls={listId}
          enabled={canMoveNext}
          hovered={hoveredSide === 'next'}
          onClick={() => moveCards('next')}
        />
      </div>
    </section>
  );
}

type SectionMoveButtonProps = {
  direction: MoveDirection;
  controls: string;
  /** 그 방향으로 넘길 카드가 남았는지. */
  enabled: boolean;
  /** 마우스가 줄의 그쪽 절반에 올라가 있는지. */
  hovered: boolean;
  onClick: () => void;
};

/**
 * 마우스를 쓰는 화면에서 카드 줄 가장자리에 뜨는 넘김 버튼.
 * 넘길 카드가 남은 방향에 마우스를 올리거나 키보드 초점이 오면 표지 높이의 가운데에 나타난다.
 */
function SectionMoveButton({
  direction,
  controls,
  enabled,
  hovered,
  onClick,
}: SectionMoveButtonProps) {
  const isPrev = direction === 'prev';

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={
        isPrev ? STORY_LIST_COPY.prevLabel : STORY_LIST_COPY.nextLabel
      }
      aria-controls={controls}
      disabled={!enabled}
      onClick={onClick}
      className={cn(
        // 표지는 카드 폭의 4/3 높이다. 카드 폭은 (줄 폭 - 40px) / 2다.
        'absolute top-[calc((100cqw-2.5rem)/3)] z-20 hidden size-9 -translate-y-1/2 rounded-full bg-background p-0 text-foreground shadow-md transition-opacity duration-150 motion-reduce:transition-none dark:bg-background pointer-fine:inline-flex',
        isPrev ? 'left-2' : 'right-2',
        // 끌어서 넘기는 동안에는 마우스가 줄을 가로질러도 버튼을 띄우지 않는다.
        enabled && hovered
          ? 'opacity-100 in-data-drag-scrolling:opacity-0'
          : 'pointer-events-none opacity-0 focus-visible:pointer-events-auto focus-visible:opacity-100 disabled:opacity-0',
      )}>
      <HugeiconsIcon
        icon={isPrev ? ArrowLeft01Icon : ArrowRight01Icon}
        className="size-5"
        strokeWidth={2}
        aria-hidden="true"
      />
    </Button>
  );
}
