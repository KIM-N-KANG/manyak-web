'use client';

import { Button } from '@/components/ui/button';

import { useStartChat } from '../hooks/use-start-chat';

type StoryDetailCtaProps = {
  storyId: number;
};

export function StoryDetailCta({ storyId }: StoryDetailCtaProps) {
  const { startChat, isStarting, isError } = useStartChat(storyId);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-border bg-background px-4">
      <div className="flex flex-col gap-1 py-3">
        {isError && (
          <p className="text-center text-sm text-destructive">
            채팅을 시작하지 못했어요. 다시 시도해주세요.
          </p>
        )}
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
