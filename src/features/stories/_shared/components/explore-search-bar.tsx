'use client';

import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { useMainScroll } from '@/components/layout/main-scroll-context';
import { APP_PATH } from '@/constants/app-path';
import { EXPLORE_SEARCH_COPY } from '@/features/stories/_shared/constants/explore-search';
import { cn } from '@/lib/utils';

/**
 * 검색바 숨김과 재노출 모션이다. 바는 스크롤 영역 안에 sticky로 붙어 자리를 비우지 않고 위로 미끄러지기만 하므로
 * 목록 높이와 스크롤 위치가 바뀌지 않는다. 사라짐은 짧은 가속 곡선, 나타남은 조금 긴 감속 곡선이다.
 * 숨은 뒤에는 invisible로 포커스와 보조 기술에서 빠진다.
 */
const SEARCH_BAR_MOTION = {
  hidden:
    'invisible -translate-y-full duration-150 ease-[cubic-bezier(0.4,0,1,1)]',
  shown: 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
};

export function ExploreSearchBar() {
  const { isSearchBarHidden } = useMainScroll();

  return (
    <div
      className={cn(
        'sticky top-0 z-20 shrink-0 bg-background px-4 pb-4 transition-[translate,visibility] motion-reduce:transition-none',
        isSearchBarHidden ? SEARCH_BAR_MOTION.hidden : SEARCH_BAR_MOTION.shown,
      )}>
      <Link
        href={APP_PATH.EXPLORE_SEARCH()}
        aria-label={EXPLORE_SEARCH_COPY.label}
        className="flex h-10 items-center gap-2 rounded-md border border-border bg-input px-3.5 text-sm text-foreground-tertiary outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input">
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={2}
          className="size-4 text-foreground-secondary"
          aria-hidden="true"
        />
        {EXPLORE_SEARCH_COPY.placeholder}
      </Link>
    </div>
  );
}
