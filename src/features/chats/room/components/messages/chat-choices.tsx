'use client';

import { BubbleChatEditIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m, type Variants } from 'motion/react';

import { Button } from '@/components/ui/button';
import { ChatTextSegments } from '@/features/chats/_shared/components/chat-text-segments';

type ChatChoicesProps = {
  choices: string[];
  onSend: (text: string, position: number) => void;
  onFill: (text: string, position: number) => void;
  /** 추천 입력 사용법을 처음 한 번 소개하는 인라인 힌트 노출 여부. */
  showsHint?: boolean;
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

export function ChatChoices({
  choices,
  onSend,
  onFill,
  showsHint = false,
}: ChatChoicesProps) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <m.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-2 px-4 pt-2 pb-6">
      {showsHint && (
        <m.div
          variants={itemVariants}
          className="flex flex-col gap-0.5 text-right text-xs break-keep text-foreground-secondary">
          <p>AI가 추천하는 입력이에요</p>
          <p>
            탭하면 바로 전송되고,{' '}
            <HugeiconsIcon
              icon={BubbleChatEditIcon}
              aria-hidden="true"
              className="inline size-3.5 align-[-2.5px]"
            />{' '}
            버튼으로 고쳐서 보낼 수 있어요
          </p>
        </m.div>
      )}
      {choices.map((choice, index) => (
        <m.div
          key={`${index}-${choice}`}
          variants={itemVariants}
          className="flex items-center justify-end gap-1">
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
