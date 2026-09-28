'use client';

import { createContext, type ReactNode, use, useState } from 'react';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m, type Transition, useReducedMotion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** 목록 항목 머리 줄의 버튼 문구다. */
export const COLLAPSIBLE_LIST_ITEM_COPY = {
  collapse: '접기',
  expand: '펼치기',
  remove: '삭제',
} as const;

const { collapse, expand, remove } = COLLAPSIBLE_LIST_ITEM_COPY;

const HEADER_BUTTON_CLASS_NAME =
  'justify-end rounded-none px-0 text-sm text-foreground-secondary aria-expanded:text-foreground-secondary aria-expanded:hover:text-foreground';

const BODY_TRANSITION: Transition = {
  type: 'spring',
  bounce: 0,
  visualDuration: 0.3,
};

type CollapsedListItems = {
  collapsedIds: ReadonlySet<string>;
  setCollapsed: (id: string, collapsed: boolean) => void;
};

const CollapsedListItemsContext = createContext<CollapsedListItems | null>(
  null,
);

/** 항목의 접힘 상태를 탭·단계를 바꿔 항목이 다시 그려져도 남도록 항목 컴포넌트 밖에서 id별로 보관한다. */
export function CollapsedListItemsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const setCollapsed = (id: string, collapsed: boolean) =>
    setCollapsedIds((previous) => {
      const next = new Set(previous);

      if (collapsed) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });

  return (
    <CollapsedListItemsContext value={{ collapsedIds, setCollapsed }}>
      {children}
    </CollapsedListItemsContext>
  );
}

type CollapsibleListItemProps = {
  id: string;
  label: string;
  order: number;
  maxCount: number;
  /** 없으면 삭제 버튼을 두지 않는다. */
  onRemove?: () => void;
  removeDisabled?: boolean;
  children: ReactNode;
};

export function CollapsibleListItem({
  id,
  label,
  order,
  maxCount,
  onRemove,
  removeDisabled,
  children,
}: CollapsibleListItemProps) {
  const collapsedItems = use(CollapsedListItemsContext);
  const shouldReduceMotion = useReducedMotion();
  const [isAnimating, setIsAnimating] = useState(false);

  if (!collapsedItems) {
    throw new Error(
      'CollapsibleListItem은 CollapsedListItemsProvider 안에서 써야 한다.',
    );
  }

  const isExpanded = !collapsedItems.collapsedIds.has(id);
  const bodyId = `${id}-body`;

  return (
    <section className="flex flex-col">
      <div className="flex min-h-12 items-center bg-muted px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-foreground-secondary">
            {label}
          </span>
          <span className="shrink-0 rounded-full bg-border px-2 py-1 text-xs leading-none text-foreground-secondary">
            {order}/{maxCount}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="lg"
            variant="ghost"
            aria-label={`${label} ${isExpanded ? collapse : expand}`}
            aria-expanded={isExpanded}
            aria-controls={bodyId}
            className={cn(HEADER_BUTTON_CLASS_NAME, 'w-16 gap-0.5')}
            onClick={() => {
              setIsAnimating(true);
              collapsedItems.setCollapsed(id, isExpanded);
            }}>
            {isExpanded ? collapse : expand}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              aria-hidden="true"
              className={cn(
                'size-4 transition-transform duration-300 ease-out motion-reduce:transition-none',
                isExpanded && 'rotate-180',
              )}
            />
          </Button>
          {onRemove && (
            <Button
              type="button"
              size="lg"
              variant="ghost"
              aria-label={`${label} ${remove}`}
              disabled={removeDisabled}
              className={cn(HEADER_BUTTON_CLASS_NAME, 'w-12')}
              onClick={onRemove}>
              {remove}
            </Button>
          )}
        </div>
      </div>
      {/* 펼친 뒤에도 overflow를 숨기면 입력 칸의 포커스 링이 잘려 움직이는 동안만 숨기고, 다 접히면 보조 기술에서도 뺀다.
          motion의 transitionEnd로 두면 다시 그릴 때 빠진 값으로 보고 되돌리므로 완료 여부를 상태로 둔다. */}
      <m.div
        id={bodyId}
        inert={!isExpanded}
        initial={false}
        animate={
          isExpanded
            ? { height: 'auto', opacity: 1 }
            : { height: 0, opacity: 0 }
        }
        transition={shouldReduceMotion ? { duration: 0 } : BODY_TRANSITION}
        onAnimationComplete={() => setIsAnimating(false)}
        className={cn(
          (!isExpanded || isAnimating) && 'overflow-hidden',
          !isExpanded && !isAnimating && 'invisible',
        )}>
        <div className="pt-4">{children}</div>
      </m.div>
    </section>
  );
}
