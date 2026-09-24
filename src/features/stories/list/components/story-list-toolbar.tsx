import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleChip } from '@/components/ui/toggle-chip';

import {
  STORY_LIST_COPY,
  STORY_LIST_FILTER_OPTIONS,
  STORY_LIST_SORT_OPTIONS,
  type StoryListQuery,
  type StoryListSort,
} from '../constants';

type StoryListToolbarProps = {
  query: StoryListQuery;
  onChange: (query: StoryListQuery) => void;
};

export function StoryListToolbar({ query, onChange }: StoryListToolbarProps) {
  const sortLabel = STORY_LIST_SORT_OPTIONS.find(
    (option) => option.value === query.sort,
  )?.label;

  return (
    <div className="sticky top-0 z-30 -mx-4 flex items-center gap-2 bg-background py-2 pr-4">
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
