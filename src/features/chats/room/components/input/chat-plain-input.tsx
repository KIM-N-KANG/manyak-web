'use client';

import { type SubmitEvent } from 'react';

import { ArrowUp02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { PlayFilledIcon } from '@/components/icons/play-filled-icon';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@/components/ui/input-group';

import { type ChatInputMode } from '../../hooks/use-chat-input-mode';
import { submitOnShortcut } from '../../utils/submit-shortcut';
import { ChatChoicesMenu } from './chat-choices-menu';
import { ChatInputModeMenu } from './chat-input-mode-menu';

type ChatPlainInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  hasSuggestions: boolean;
  onSendRandomSuggestion: () => void;
  onInsertEmphasis: () => void;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  mode: ChatInputMode;
  onModeChange: (mode: ChatInputMode) => void;
  choicesEnabled: boolean;
  onChoicesEnabledChange: (enabled: boolean) => void;
};

export function ChatPlainInput({
  value,
  onChange,
  onSend,
  hasSuggestions,
  onSendRandomSuggestion,
  onInsertEmphasis,
  disabled,
  textareaRef,
  mode,
  onModeChange,
  choicesEnabled,
  onChoicesEnabledChange,
}: ChatPlainInputProps) {
  const hasInput = value.trim().length > 0;
  const canSend = !disabled && (hasInput || (choicesEnabled && hasSuggestions));
  const showsRandomSend = !hasInput && choicesEnabled;

  const handleSend = () => {
    if (hasInput) {
      onSend();

      return;
    }

    onSendRandomSuggestion();
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (canSend) {
      handleSend();
    }
  };

  return (
    <section className="px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <form onSubmit={handleSubmit}>
        <InputGroup className="rounded-lg">
          <InputGroupTextarea
            ref={textareaRef}
            value={value}
            rows={1}
            placeholder="이야기를 어떻게 이어갈까요?"
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => submitOnShortcut(event, canSend, handleSend)}
            className="max-h-[20dvh] pb-0"
          />
          <InputGroupAddon align="block-end" className="gap-1 pt-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="상황 묘사 추가"
              data-tour="add-situation"
              disabled={disabled}
              onClick={onInsertEmphasis}>
              상황 추가
            </Button>
            <ChatChoicesMenu
              enabled={choicesEnabled}
              onEnabledChange={onChoicesEnabledChange}
            />
            <ChatInputModeMenu mode={mode} onModeChange={onModeChange} />
            <Button
              type="submit"
              variant="default"
              size="icon-sm"
              aria-label={showsRandomSend ? '추천 입력 랜덤 전송' : '전송'}
              data-tour="send"
              disabled={!canSend}
              className="ml-auto">
              {showsRandomSend ? (
                <PlayFilledIcon aria-hidden="true" />
              ) : (
                <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden="true" />
              )}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </section>
  );
}
