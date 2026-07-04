'use client';

import { ArrowUp02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { INPUT_BLOCK_LABELS, INPUT_BLOCK_PLACEHOLDERS } from '../../constants';
import { type InputBlock, type InputBlockType } from '../../lib/input-blocks';
import { submitOnShortcut } from '../../lib/submit-shortcut';

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

  return (
    <section className="flex flex-col bg-background pb-[env(safe-area-inset-bottom)]">
      {blocks.length > 0 && (
        <div className="py-1">
          <div className="flex max-h-[25dvh] scrollbar-none flex-col gap-2 overflow-y-auto px-4 py-1">
            {blocks.map((block) => (
              <div key={block.id} className="flex items-center gap-2">
                <Badge variant="secondary">
                  {INPUT_BLOCK_LABELS[block.type]}
                </Badge>
                <Textarea
                  ref={(element) => onRegisterInput(block.id, element)}
                  value={block.value}
                  rows={1}
                  placeholder={INPUT_BLOCK_PLACEHOLDERS[block.type]}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdateBlock(block.id, event.target.value)
                  }
                  onKeyDown={(event) =>
                    submitOnShortcut(event, canSend, onSend)
                  }
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
                  onClick={() => onRemoveBlock(block.id)}
                  className="shrink-0 text-foreground-tertiary">
                  <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 p-4 pt-2">
        <Button
          type="button"
          aria-label="상황 묘사 추가"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => onAddBlock('situation')}>
          상황 추가
        </Button>
        <Button
          type="button"
          aria-label="대사 추가"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => onAddBlock('dialogue')}>
          대사 추가
        </Button>
        <Button
          type="button"
          size="icon-sm"
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
