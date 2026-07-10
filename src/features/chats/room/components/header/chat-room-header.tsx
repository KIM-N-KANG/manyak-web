'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';

import { type ChatInputMode } from '../../hooks/use-chat-input-mode';
import { ChatCreditInfoPopover } from './chat-credit-info-popover';
import { ChatSettingsDrawer } from './chat-settings-drawer';

type ChatRoomHeaderProps = {
  chatId: string;
  storyTitle: string;
  inputMode: ChatInputMode;
  onInputModeChange: (mode: ChatInputMode) => void;
};

export function ChatRoomHeader({
  chatId,
  storyTitle,
  inputMode,
  onInputModeChange,
}: ChatRoomHeaderProps) {
  const router = useRouter();

  const goBack = () => router.push(APP_PATH.MAIN.CHATS);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-2">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="채팅 목록으로 돌아가기 버튼"
        onClick={goBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>
      <h1 className="min-w-0 flex-1 truncate font-semibold">{storyTitle}</h1>
      <div className="flex items-center gap-1">
        <ChatCreditInfoPopover />
        <ChatSettingsDrawer
          chatId={chatId}
          mode={inputMode}
          onModeChange={onInputModeChange}
        />
      </div>
    </header>
  );
}
