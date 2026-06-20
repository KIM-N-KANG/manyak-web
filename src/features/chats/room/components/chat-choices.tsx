'use client';

import { CornerDownRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Label } from '@/components/ui/label';

type ChatChoicesProps = {
  choices: string[];
  onPick: (text: string) => void;
};

export function ChatChoices({ choices, onPick }: ChatChoicesProps) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <Label className="text-foreground-secondary">AI 추천 입력</Label>
      {choices.map((choice, index) => (
        <button
          key={`${index}-${choice}`}
          type="button"
          className="flex w-full items-start gap-1.5 text-left transition-opacity hover:opacity-70"
          onClick={() => onPick(choice)}>
          <HugeiconsIcon
            icon={CornerDownRightIcon}
            className="size-4 shrink-0 text-foreground-secondary"
            aria-hidden="true"
          />
          <span className="text-sm break-keep whitespace-normal text-foreground-secondary">
            {choice}
          </span>
        </button>
      ))}
    </div>
  );
}
