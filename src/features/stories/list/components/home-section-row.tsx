'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { useMainScroll } from '@/components/layout/main-scroll-context';
import { StoryCard } from '@/features/stories/_shared/components/story-card';
import type { StoryListItem } from '@/features/stories/_shared/types/story-list';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import { useInView } from '@/hooks/use-in-view';

/**
 * 처음 화면에 걸치는 카드 수. 카드 너비 클래스와 함께 바꾼다.
 * 카드 폭은 (줄 폭 - 40px) / 2다. 왼쪽 여백 16px 뒤로 두 장과 셋째 카드의 앞 8px, 그 사이 8px 둘이 줄 폭을 채운다.
 * 카드 시작점을 왼쪽 여백에 맞춰 넘긴 자리에서는 앞 카드도 8px이 남아 양옆에 같은 폭이 보인다.
 */
const INITIAL_VISIBLE_CARD_COUNT = 3;

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
  const listRef = useRef<HTMLUListElement>(null);
  const dragScrollProps = useDragScroll();
  const { scrollContainer } = useMainScroll();
  const [sectionElement, setSectionElement] = useState<HTMLElement | null>(
    null,
  );
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

    const updateCoverLoadCount = () => {
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
    const observer = new ResizeObserver(updateCoverLoadCount);

    observer.observe(list);
    list.addEventListener('scroll', updateCoverLoadCount, { passive: true });

    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', updateCoverLoadCount);
    };
  }, []);

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
      <ul
        {...dragScrollProps}
        ref={listRef}
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
    </section>
  );
}
