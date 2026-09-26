'use client';

import { Suspense } from 'react';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useMainScroll } from '@/components/layout/main-scroll-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { APP_PATH } from '@/constants/app-path';
import { cn } from '@/lib/utils';

import {
  DEFAULT_STORY_LIST_QUERY,
  STORY_LIST_COPY,
  STORY_LIST_FILTER_OPTIONS,
  STORY_LIST_SORT_OPTIONS,
  type StoryListQuery,
  type StoryListSort,
} from '../constants';
import {
  parseStoryListQuery,
  toStoryListSearch,
} from '../utils/story-list-query';

type StoryListToolbarViewProps = {
  query: StoryListQuery;
  onChange: (query: StoryListQuery) => void;
};

/**
 * 필터 바 숨김·재노출 모션이다. 바는 목록 스크롤 영역 안에 sticky로 붙어 있어 자리를 비우지 않고 위로 미끄러지기만 하므로
 * 목록 높이와 스크롤 위치가 바뀌지 않는다. 사라짐은 짧은 가속 곡선, 나타남은 조금 긴 감속 곡선(iOS 시트 곡선)이다.
 * 숨은 뒤에는 invisible로 포커스·보조기기에서 빠진다.
 */
const TOOLBAR_MOTION = {
  hidden:
    'invisible -translate-y-full duration-150 ease-[cubic-bezier(0.4,0,1,1)]',
  shown: 'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
};

/**
 * 홈 목록 위의 필터·정렬 바. 아래로 스크롤하면 위로 숨고 위로 스크롤하면 다시 내려온다.
 */
export function StoryListToolbar() {
  const { isToolbarHidden } = useMainScroll();

  return (
    <div
      className={cn(
        'sticky top-0 z-20 shrink-0 transition-[translate,visibility] motion-reduce:transition-none',
        isToolbarHidden ? TOOLBAR_MOTION.hidden : TOOLBAR_MOTION.shown,
      )}>
      <Suspense
        fallback={
          <StoryListToolbarView
            query={DEFAULT_STORY_LIST_QUERY}
            onChange={() => {}}
          />
        }>
        <UrlStoryListToolbar />
      </Suspense>
    </div>
  );
}

function UrlStoryListToolbar() {
  const router = useRouter();
  const query = parseStoryListQuery(useSearchParams());

  return (
    <StoryListToolbarView
      query={query}
      onChange={(nextQuery) =>
        router.replace(
          `${APP_PATH.MAIN.STORIES}${toStoryListSearch(nextQuery)}`,
          { scroll: false },
        )
      }
    />
  );
}

function StoryListToolbarView({ query, onChange }: StoryListToolbarViewProps) {
  const sortLabel = STORY_LIST_SORT_OPTIONS.find(
    (option) => option.value === query.sort,
  )?.label;

  return (
    <div className="flex shrink-0 items-center gap-2 bg-background py-2 pr-4">
      <div
        role="group"
        aria-label={STORY_LIST_COPY.filterGroupLabel}
        className="scrollbar-none flex min-w-0 flex-1 gap-2 overflow-x-auto overscroll-x-contain pl-4">
        {STORY_LIST_FILTER_OPTIONS.map((option) => (
          <ToggleChip
            key={option.value}
            size="sm"
            className="h-9 shrink-0 rounded-full bg-background px-4 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            pressed={query.filter === option.value}
            onPressedChange={(pressed) => {
              if (pressed) {
                onChange({ ...query, filter: option.value });
              }
            }}>
            {option.label}
          </ToggleChip>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="shrink-0"
              size="sm"
              aria-label={`${STORY_LIST_COPY.sortTriggerLabel}: ${sortLabel}`}
            />
          }>
          {sortLabel}
          <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          <DropdownMenuRadioGroup
            value={query.sort}
            onValueChange={(value: StoryListSort) =>
              onChange({ ...query, sort: value })
            }>
            {STORY_LIST_SORT_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                closeOnClick>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
