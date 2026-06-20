'use client';

import { Button } from '@/components/ui/button';

import { useStartChat } from '../hooks/use-start-chat';

type StoryDetailCtaProps = {
  storyId: number;
};

export function StoryDetailCta({ storyId }: StoryDetailCtaProps) {
  const { startChat, isStarting } = useStartChat(storyId);

  return (
    /** @todo 에러 발생 시 Sonner 표시 추가 */
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
      <div className="flex h-full w-full items-center">
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
