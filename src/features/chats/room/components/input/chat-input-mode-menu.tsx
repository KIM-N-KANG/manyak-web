'use client';

import { Settings01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { CHAT_INPUT_MODE_OPTIONS } from '../../constants';
import { type ChatInputMode } from '../../hooks/use-chat-input-mode';

type ChatInputModeMenuProps = {
  mode: ChatInputMode;
  onModeChange: (mode: ChatInputMode) => void;
};

export function ChatInputModeMenu({
  mode,
  onModeChange,
}: ChatInputModeMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="입력 모드 변경"
          />
        }>
        <HugeiconsIcon icon={Settings01Icon} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => onModeChange(value as ChatInputMode)}>
          {CHAT_INPUT_MODE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <div className="flex flex-col gap-0.5">
                <span>{option.label}</span>
                <span className="text-xs break-keep text-foreground-secondary">
                  {option.description}
                </span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
