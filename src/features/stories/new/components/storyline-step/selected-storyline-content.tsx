'use client';

import { useEffect, useRef, useState } from 'react';

import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { SELECTED_STORYLINE_COLLAPSED_MAX_HEIGHT } from '../../constants';

type SelectedStorylineContentProps = {
  story?: string;
};

export function SelectedStorylineContent({
  story,
}: SelectedStorylineContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = contentRef.current;

    if (!element) return;

    setIsCollapsible(
      element.scrollHeight > SELECTED_STORYLINE_COLLAPSED_MAX_HEIGHT,
    );
  }, [story]);

  const isCollapsed = isCollapsible && !isExpanded;

  return (
    <div className="mt-4 flex flex-col gap-2 bg-muted p-4 pb-2">
      <div
        ref={contentRef}
        className={cn(
          'relative overflow-hidden transition-[max-height] duration-300 ease-in-out',
          isCollapsed ? 'max-h-lh' : '',
        )}>
        <TextContent>{story}</TextContent>
        {isCollapsed && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-lh bg-linear-to-t from-muted to-transparent"
          />
        )}
      </div>

      {isCollapsible && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-center text-foreground-secondary"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}>
          {isExpanded ? '접기' : '더보기'}
          <HugeiconsIcon
            icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
            aria-hidden="true"
          />
        </Button>
      )}
    </div>
  );
}
