'use client';

import { useState } from 'react';

import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SelectedStorylineContentProps = {
  story?: string;
};

export function SelectedStorylineContent({
  story,
}: SelectedStorylineContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'relative overflow-hidden transition-[max-height] duration-300 ease-in-out',
          isExpanded ? '' : 'max-h-16',
        )}>
        <TextContent>{story}</TextContent>
        {!isExpanded && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-background to-transparent"
          />
        )}
      </div>

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
    </div>
  );
}
