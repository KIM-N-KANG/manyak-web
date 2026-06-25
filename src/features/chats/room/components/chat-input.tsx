'use client';

import { type KeyboardEvent, type SubmitEvent } from 'react';

import { ArrowUp02Icon, Asterisk02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { ONBOARDING_TARGET } from '@/features/onboarding/constants';

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onInsertEmphasis: () => void;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onInsertEmphasis,
  disabled,
  textareaRef,
}: ChatInputProps) {
  const canSend = value.trim().length > 0 && !disabled;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (canSend) {
      onSend();
    }
  };

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
    <section className="px-4 py-2">
      <form onSubmit={handleSubmit} data-onborda={ONBOARDING_TARGET.CHAT_INPUT}>
        <InputGroup className="rounded-lg">
          <InputGroupTextarea
            ref={textareaRef}
            value={value}
            rows={1}
            placeholder="이야기를 어떻게 이어갈까요?"
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-[20dvh] min-h-0"
          />
          <InputGroupAddon align="block-end">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="강조 표시 추가"
              disabled={disabled}
              onClick={onInsertEmphasis}>
              <HugeiconsIcon icon={Asterisk02Icon} aria-hidden="true" />
            </Button>
            <Button
              type="submit"
              variant="default"
              size="icon-sm"
              aria-label="전송"
              disabled={!canSend}
              className="ml-auto">
              <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden="true" />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </section>
  );
}
