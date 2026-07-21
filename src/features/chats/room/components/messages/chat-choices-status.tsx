'use client';

import { m, type Variants } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import type { ChoicesStatus as ChoicesStatusValue } from '../../hooks/use-chat-choices';

type ChatChoicesStatusProps = {
  status: ChoicesStatusValue['status'];
  onRetry: () => void;
};

// ChatChoices의 등장 애니메이션과 같은 톤으로 맞춘다.
const listVariants: Variants = {
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function ChatChoicesStatus({ status, onRetry }: ChatChoicesStatusProps) {
  if (status === 'loading') {
    return (
      <m.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        aria-label="선택지를 만드는 중"
        className="flex flex-col items-end gap-2 p-4 pb-6">
        {Array.from({ length: 3 }, (_, index) => (
          <m.div key={index} variants={itemVariants} className="w-4/5">
            <Skeleton className="h-10 w-full" />
          </m.div>
        ))}
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-end gap-2 p-4 pb-6">
      <p className="text-sm text-foreground-secondary">
        선택지를 만들지 못했어요
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        다시 시도
      </Button>
    </m.div>
  );
}
