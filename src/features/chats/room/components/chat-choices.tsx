'use client';

import { BubbleChatEditIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import { parseTextSegments } from '@/lib/parse-text-segments';
import { cn } from '@/lib/utils';

type ChatChoicesProps = {
  choices: string[];
  onSend: (text: string, position: number) => void;
  onFill: (text: string) => void;
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
            onClick={() => onFill(choice)}>
            <HugeiconsIcon icon={BubbleChatEditIcon} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onSend(choice, index)}
            className="h-auto min-h-10 w-5/6 justify-start text-left font-maruburi font-normal whitespace-normal">
            <span>
              {parseTextSegments(choice).map((segment, segmentIndex) => (
                <span
                  key={segmentIndex}
                  className={cn(
                    segment.emphasis && 'text-foreground-secondary',
                    segment.bold && 'font-bold',
                  )}>
                  {segment.text}
                </span>
              ))}
            </span>
          </Button>
        </div>
      ))}
    </div>
  );
}
