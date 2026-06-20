'use client';

import { Button } from '@/components/ui/button';

type ChatChoicesProps = {
  choices: string[];
  onPick: (text: string) => void;
};

export function ChatChoices({ choices, onPick }: ChatChoicesProps) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      {choices.map((choice, index) => (
        <Button
          key={`${index}-${choice}`}
          type="button"
          variant="outline"
          size="lg"
          className="h-auto justify-start py-3 text-left whitespace-normal"
          onClick={() => onPick(choice)}>
          {choice}
        </Button>
      ))}
    </div>
  );
}
