'use client';

import { SidebarRightIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

import { type ChatInputMode } from '../hooks/use-chat-input-mode';

const MODE_OPTIONS: {
  value: ChatInputMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'block',
    label: '블럭 입력',
    description: '상황과 대사를 나눠서 입력해요',
  },
  {
    value: 'plain',
    label: '일반 입력',
    description: '한 입력창에 자유롭게 입력해요',
  },
];

type ChatSettingsDrawerProps = {
  mode: ChatInputMode;
  onModeChange: (mode: ChatInputMode) => void;
};

export function ChatSettingsDrawer({
  mode,
  onModeChange,
}: ChatSettingsDrawerProps) {
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="채팅 설정 열기">
          <HugeiconsIcon icon={SidebarRightIcon} aria-hidden="true" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>채팅 설정</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-2 overflow-y-auto p-4 pt-0">
          <p className="text-xs font-medium text-foreground-secondary">
            입력 모드
          </p>
          {MODE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={mode === option.value ? 'secondary' : 'ghost'}
              onClick={() => onModeChange(option.value)}
              className="h-auto w-full flex-col items-start gap-0.5 whitespace-normal">
              <span className="flex w-full items-center justify-between">
                {option.label}
                {mode === option.value && (
                  <HugeiconsIcon icon={Tick02Icon} aria-hidden="true" />
                )}
              </span>
              <span className="text-xs font-normal text-foreground-secondary">
                {option.description}
              </span>
            </Button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
