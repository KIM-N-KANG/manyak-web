'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, m } from 'motion/react';

import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';

import { SELECTED_STORYLINE_COLLAPSED_MAX_HEIGHT } from '../../constants';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type SelectedStorylineContentProps = {
  story?: string;
};

export function SelectedStorylineContent({
  story,
}: SelectedStorylineContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 측정 전에는 접힘을 기본값으로 두어, 마운트 시 펼쳐진 상태가 그려졌다가
  // 접히는 깜빡임을 방지한다. 짧은 콘텐츠는 측정 후 펼침으로 정정된다.
  const [isCollapsible, setIsCollapsible] = useState(true);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 페인트 전에 접힘 여부를 확정해 짧은 콘텐츠의 깜빡임까지 방지한다.
  useIsomorphicLayoutEffect(() => {
    const element = contentRef.current;

    if (!element) return;

    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);

    if (!Number.isNaN(lineHeight)) {
      setCollapsedHeight(lineHeight);
    }

    setIsCollapsible(
      element.scrollHeight > SELECTED_STORYLINE_COLLAPSED_MAX_HEIGHT,
    );
  }, [story]);

  // 초기 접힘 정착 이후(다음 프레임)부터 애니메이션을 켜서,
  // 사용자의 더보기/접기 토글에만 전환 애니메이션이 적용되도록 한다.
  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsAnimationEnabled(true));

    return () => cancelAnimationFrame(frameId);
  }, []);

  const isCollapsed = isCollapsible && !isExpanded;

  return (
    <div className="mt-4 flex flex-col gap-2 bg-muted p-4 pb-2">
      <m.div
        ref={contentRef}
        className="relative overflow-hidden"
        initial={false}
        animate={{
          height: isCollapsed ? (collapsedHeight ?? '1lh') : 'auto',
        }}
        transition={{
          duration: isAnimationEnabled ? 0.3 : 0,
          ease: 'easeInOut',
        }}>
        <TextContent>{story}</TextContent>
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
