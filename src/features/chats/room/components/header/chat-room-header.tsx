'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { cn } from '@/lib/utils';

import { CHAT_HEADER_HEIGHT_CLASS } from '../../constants';
import { type ChatInputMode } from '../../hooks/use-chat-input-mode';
import { ChatSettingsDrawer } from './chat-settings-drawer';

type ChatRoomHeaderProps = {
  chatId: string;
  storyTitle: string;
  isVisible: boolean;
  inputMode: ChatInputMode;
  onInputModeChange: (mode: ChatInputMode) => void;
};

export function ChatRoomHeader({
  chatId,
  storyTitle,
  isVisible,
  inputMode,
  onInputModeChange,
}: ChatRoomHeaderProps) {
  const router = useRouter();

  const goBack = () => router.push(APP_PATH.MAIN.CHATS);

  return (
    <header
      aria-hidden={!isVisible}
      inert={!isVisible}
      className={cn(
        'absolute inset-x-0 top-0 z-50 flex items-center gap-2 bg-background px-2 transition-[translate] duration-300 ease-out',
        CHAT_HEADER_HEIGHT_CLASS,
        isVisible ? 'translate-y-0' : '-translate-y-full',
      )}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="채팅 목록으로 돌아가기 버튼"
        onClick={goBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>
      <h1 className="min-w-0 flex-1 truncate font-semibold">{storyTitle}</h1>
      <ChatSettingsDrawer
        chatId={chatId}
        mode={inputMode}
        onModeChange={onInputModeChange}
      />
    </header>
  );
}
