'use client';

import { useState } from 'react';

import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

import { INPUT_BLOCK_LABELS, INPUT_BLOCK_PLACEHOLDERS } from '../../constants';
import { type ChatInputMode } from '../../hooks/use-chat-input-mode';
import { type InputBlock, type InputBlockType } from '../../utils/input-blocks';
import { submitOnShortcut } from '../../utils/submit-shortcut';
import { ChatChoicesMenu } from './chat-choices-menu';
import { ChatInputModeMenu } from './chat-input-mode-menu';
import { SendButtonIcon } from './send-button-icon';

type ChatBlockInputProps = {
  blocks: InputBlock[];
  onAddBlock: (type: InputBlockType) => void;
  onRemoveBlock: (id: string) => void;
  onUpdateBlock: (id: string, value: string) => void;
  onRegisterInput: (id: string, element: HTMLTextAreaElement | null) => void;
  onSend: () => void;
  hasSuggestions: boolean;
  onSendRandomSuggestion: () => void;
  isStreaming: boolean;
  mode: ChatInputMode;
  onModeChange: (mode: ChatInputMode) => void;
  choicesEnabled: boolean;
  onChoicesEnabledChange: (enabled: boolean) => void;
};

export function ChatBlockInput({
  blocks,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlock,
  onRegisterInput,
  onSend,
  hasSuggestions,
  onSendRandomSuggestion,
  isStreaming,
  mode,
  onModeChange,
  choicesEnabled,
  onChoicesEnabledChange,
}: ChatBlockInputProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const hasInput = blocks.some((block) => block.value.trim().length > 0);
  const canSend =
    !isStreaming && (hasInput || (choicesEnabled && hasSuggestions));
  const showsRandomSend = !hasInput && choicesEnabled;

  const handleSend = () => {
    if (hasInput) {
      onSend();

      return;
    }

    onSendRandomSuggestion();
  };

  const requestRemoveBlock = (block: InputBlock) => {
    if (block.value.trim().length > 0) {
      setPendingDeleteId(block.id);

      return;
    }

    onRemoveBlock(block.id);
  };

  const confirmRemoveBlock = () => {
    if (pendingDeleteId !== null) {
      onRemoveBlock(pendingDeleteId);
    }

    setPendingDeleteId(null);
  };

  return (
    <section className="flex flex-col bg-background pb-[env(safe-area-inset-bottom)]">
      {blocks.length > 0 && (
        <div className="flex max-h-[30dvh] flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-2">
          {blocks.map((block) => (
            <div key={block.id} className="flex items-center gap-1">
              <InputGroup>
                <InputGroupAddon>
                  <span
                    className={cn(
                      'text-xs',
                      block.type === 'situation'
                        ? 'text-foreground-secondary'
                        : 'text-foreground',
                    )}>
                    {INPUT_BLOCK_LABELS[block.type]}
                  </span>
                </InputGroupAddon>
                <InputGroupTextarea
                  ref={(element) => onRegisterInput(block.id, element)}
                  value={block.value}
                  rows={1}
                  placeholder={INPUT_BLOCK_PLACEHOLDERS[block.type]}
                  disabled={isStreaming}
                  onChange={(event) =>
                    onUpdateBlock(block.id, event.target.value)
                  }
                  onKeyDown={(event) =>
                    submitOnShortcut(event, canSend, handleSend)
                  }
                  className={cn(
                    'max-h-[4lh] resize-none py-2.25',
                    block.type === 'situation'
                      ? 'text-foreground-secondary'
                      : 'text-foreground',
                  )}
                />
              </InputGroup>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="입력 삭제"
                disabled={isStreaming}
                tabIndex={-1}
                onClick={() => requestRemoveBlock(block)}
                className="shrink-0 text-foreground-secondary">
                <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 p-4 pt-0">
        <Button
          type="button"
          aria-label="상황 묘사 추가"
          data-tour="add-situation"
          size="sm"
          variant="secondary"
          disabled={isStreaming}
          onClick={() => onAddBlock('situation')}>
          상황 추가
        </Button>
        <Button
          type="button"
          aria-label="대사 추가"
          data-tour="add-dialogue"
          size="sm"
          variant="secondary"
          disabled={isStreaming}
          onClick={() => onAddBlock('dialogue')}>
          대사 추가
        </Button>
        <ChatChoicesMenu
          enabled={choicesEnabled}
          onEnabledChange={onChoicesEnabledChange}
        />
        <ChatInputModeMenu mode={mode} onModeChange={onModeChange} />
        <Button
          type="button"
          size="icon-sm"
          aria-label={showsRandomSend ? '추천 입력 랜덤 전송' : '전송'}
          data-tour="send"
          disabled={!canSend}
          onClick={handleSend}
          className="ml-auto">
          <SendButtonIcon
            isStreaming={isStreaming}
            showsRandomSend={showsRandomSend}
          />
        </Button>
      </div>

      <ConfirmAlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
        onConfirm={confirmRemoveBlock}
        title="작성한 내용을 삭제할까요?"
        description="삭제하면 작성한 내용이 사라져요"
        cancelLabel="그대로 두기"
        confirmLabel="삭제하기"
      />
    </section>
  );
}
