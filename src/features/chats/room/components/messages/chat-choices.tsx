'use client';

import { BubbleChatEditIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';

import { ChatTextSegments } from '../message-content/chat-text-segments';

type ChatChoicesProps = {
  choices: string[];
  onSend: (text: string, position: number) => void;
  onFill: (text: string, position: number) => void;
};

export function ChatChoices({ choices, onSend, onFill }: ChatChoicesProps) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 p-4 pb-6">
      {choices.map((choice, index) => (
        <div
          key={`${index}-${choice}`}
          style={{
            animationDelay: `${index * 80}ms`,
            animationFillMode: 'backwards',
          }}
          className="flex animate-in items-center justify-end gap-2 duration-300 fade-in slide-in-from-bottom-2">
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
        </div>
      ))}
    </div>
  );
}
