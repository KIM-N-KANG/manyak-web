'use client';

import { AiChat02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { CHAT_CHOICES_TOGGLE_OPTIONS } from '../../constants';

type ChatChoicesMenuProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
};

export function ChatChoicesMenu({
  enabled,
  onEnabledChange,
}: ChatChoicesMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="추천 입력 설정"
            className={cn(
              enabled &&
                'text-primary hover:text-primary aria-expanded:text-primary',
            )}
          />
        }>
        <HugeiconsIcon icon={AiChat02Icon} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuRadioGroup
          value={enabled ? 'on' : 'off'}
          onValueChange={(value) => onEnabledChange(value === 'on')}>
          {CHAT_CHOICES_TOGGLE_OPTIONS.map((option) => (
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
