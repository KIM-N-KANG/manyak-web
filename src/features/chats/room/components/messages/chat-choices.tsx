'use client';

import { BubbleChatEditIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m, type Variants } from 'motion/react';

import { Button } from '@/components/ui/button';

import { ChatTextSegments } from '../message-content/chat-text-segments';

type ChatChoicesProps = {
  choices: string[];
  onSend: (text: string, position: number) => void;
  onFill: (text: string, position: number) => void;
};

const listVariants: Variants = {
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function ChatChoices({ choices, onSend, onFill }: ChatChoicesProps) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <m.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-2 p-4 pt-8 pb-6">
      {choices.map((choice, index) => (
        <m.div
          key={`${index}-${choice}`}
          variants={itemVariants}
          className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="입력창에 넣어 수정"
            onClick={() => onFill(choice, index)}
            className="text-foreground-secondary">
            <HugeiconsIcon icon={BubbleChatEditIcon} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSend(choice, index)}
            className="h-auto min-h-10 w-4/5 justify-start text-left font-maruburi font-normal whitespace-normal">
            <span>
              <ChatTextSegments>{choice}</ChatTextSegments>
            </span>
          </Button>
        </m.div>
      ))}
    </m.div>
  );
}
