'use client';

import { useEffect, useRef, useState } from 'react';

import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SelectedStorylineContentProps = {
  story?: string;
};

const COLLAPSED_MAX_HEIGHT = 64; // max-h-16

export function SelectedStorylineContent({
  story,
}: SelectedStorylineContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = contentRef.current;

    if (!element) return;

    setIsCollapsible(element.scrollHeight > COLLAPSED_MAX_HEIGHT);
  }, [story]);

  const isCollapsed = isCollapsible && !isExpanded;

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={contentRef}
        className={cn(
          'relative overflow-hidden transition-[max-height] duration-300 ease-in-out',
          isCollapsed ? 'max-h-16' : '',
        )}>
        <TextContent>{story}</TextContent>
        {isCollapsed && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-background to-transparent"
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
        </Button>
      )}
    </div>
  );
}
