'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type ChatChoicesProps = {
  choices: string[];
  onPick: (text: string, position: number) => void;
};

export function ChatChoices({ choices, onPick }: ChatChoicesProps) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <Label className="text-foreground-secondary">AI 추천 입력</Label>
      {choices.map((choice, index) => (
        <Button
          key={`${index}-${choice}`}
          type="button"
          variant="secondary"
          onClick={() => onPick(choice, index)}
          className="h-auto min-h-10 justify-start py-2.5 text-left whitespace-normal">
          {choice}
        </Button>
      ))}
    </div>
  );
}
