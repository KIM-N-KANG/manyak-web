'use client';

import { Button } from '@/components/ui/button';

import { useStartChat } from '../hooks/use-start-chat';

type StoryDetailCtaProps = {
  storyId: string;
};

export function StoryDetailCta({ storyId }: StoryDetailCtaProps) {
  const { startChat, isStarting } = useStartChat(storyId);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md bg-background px-4 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 w-full items-center">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={isStarting}
          onClick={startChat}>
          {isStarting ? '채팅을 시작하는 중...' : '채팅 시작하기'}
        </Button>
      </div>
    </nav>
  );
}
