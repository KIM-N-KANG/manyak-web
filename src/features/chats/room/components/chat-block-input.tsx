'use client';

import { type KeyboardEvent } from 'react';

import { ArrowUp02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { type InputBlock, type InputBlockType } from '../lib/input-blocks';

const BLOCK_PLACEHOLDERS: Record<InputBlockType, string> = {
  situation: '어떤 상황을 묘사할까요?',
  dialogue: '어떤 대사를 건넬까요?',
};

const BLOCK_LABELS: Record<InputBlockType, string> = {
  situation: '상황',
  dialogue: '대사',
};

type ChatBlockInputProps = {
  blocks: InputBlock[];
  onAddBlock: (type: InputBlockType) => void;
  onRemoveBlock: (id: string) => void;
  onUpdateBlock: (id: string, value: string) => void;
  onRegisterInput: (id: string, element: HTMLTextAreaElement | null) => void;
  onSend: () => void;
  disabled: boolean;
};

export function ChatBlockInput({
  blocks,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlock,
  onRegisterInput,
  onSend,
  disabled,
}: ChatBlockInputProps) {
  const canSend =
    !disabled && blocks.some((block) => block.value.trim().length > 0);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();

      if (canSend) {
        onSend();
      }
    }
  };

  return (
    <section className="flex flex-col pb-[env(safe-area-inset-bottom)]">
      {blocks.length > 0 && (
        <div className="flex max-h-[30dvh] scrollbar-none flex-col gap-2 overflow-y-auto px-4 py-2">
          {blocks.map((block) => (
            <div key={block.id} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-center text-sm text-foreground-secondary">
                {BLOCK_LABELS[block.type]}
              </span>
              <Textarea
                ref={(element) => onRegisterInput(block.id, element)}
                value={block.value}
                rows={1}
                placeholder={BLOCK_PLACEHOLDERS[block.type]}
                disabled={disabled}
                onChange={(event) =>
                  onUpdateBlock(block.id, event.target.value)
                }
                onKeyDown={handleKeyDown}
                className={cn(
                  'max-h-[4lh] min-h-10 resize-none',
                  block.type === 'situation'
                    ? 'text-foreground-secondary'
                    : 'text-foreground',
                )}
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="입력 삭제"
                disabled={disabled}
                onClick={() => onRemoveBlock(block.id)}>
                <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex h-14 items-center gap-2 bg-background px-4 py-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onAddBlock('situation')}>
          상황 추가
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onAddBlock('dialogue')}>
          대사 추가
        </Button>
        <Button
          type="button"
          size="icon"
          aria-label="전송"
          disabled={!canSend}
          onClick={onSend}
          className="ml-auto">
          <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
