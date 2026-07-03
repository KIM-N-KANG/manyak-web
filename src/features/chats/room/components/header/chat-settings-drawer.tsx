'use client';

import { LayoutAlignRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { track } from '@/observability/analytics';

import { CHAT_INPUT_MODE_OPTIONS } from '../../constants';
import { type ChatInputMode } from '../../hooks/use-chat-input-mode';

type ChatSettingsDrawerProps = {
  chatId: string;
  mode: ChatInputMode;
  onModeChange: (mode: ChatInputMode) => void;
};

export function ChatSettingsDrawer({
  chatId,
  mode,
  onModeChange,
}: ChatSettingsDrawerProps) {
  const container = useAppFrameContainer();

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="채팅 설정 열기"
          onClick={() =>
            track('client_chat_settingsButton_clicked', { chat_id: chatId })
          }>
          <HugeiconsIcon icon={LayoutAlignRightIcon} aria-hidden="true" />
        </Button>
      </DrawerTrigger>
      <DrawerContent
        container={container}
        className="absolute"
        overlayClassName="absolute">
        <DrawerHeader>
          <DrawerTitle>채팅 설정</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-2 overflow-y-auto p-4">
          <Label>입력 모드</Label>
          {CHAT_INPUT_MODE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={mode === option.value ? 'secondary' : 'ghost'}
              onClick={() => onModeChange(option.value)}
              className="h-auto w-full flex-col items-start gap-1 whitespace-normal">
              {option.label}
              <span className="text-xs text-foreground-secondary">
                {option.description}
              </span>
            </Button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
