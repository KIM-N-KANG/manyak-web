'use client';

import { useEffect, useState } from 'react';

import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, m } from 'motion/react';

import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';

type SelectedStorylineContentProps = {
  story?: string;
};

export function SelectedStorylineContent({
  story,
}: SelectedStorylineContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsAnimationEnabled(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  const isCollapsed = !isExpanded;

  return (
    <div
      data-testid="selected-storyline-content"
      className="mt-4 flex flex-col gap-2 bg-muted p-4 pb-2">
      <m.div
        className="relative overflow-hidden"
        initial={false}
        animate={{
          height: isCollapsed ? '1lh' : 'auto',
        }}
        transition={{
          duration: isAnimationEnabled ? 0.3 : 0,
          ease: 'easeInOut',
        }}>
        <TextContent font="maruburi">{story}</TextContent>
        <AnimatePresence initial={false}>
          {isCollapsed && (
            <m.div
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-lh bg-linear-to-t from-muted to-transparent"
            />
          )}
        </AnimatePresence>
      </m.div>

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
