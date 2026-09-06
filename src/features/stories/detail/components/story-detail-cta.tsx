'use client';

import { useState } from 'react';

import { useSession } from 'next-auth/react';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { HeartFilledIcon } from '@/components/icons/heart-filled-icon';
import { HeartOutlineIcon } from '@/components/icons/heart-outline-icon';
import { Button } from '@/components/ui/button';
import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { STORY_LIKE_COPY } from '@/features/stories/_shared/constants/story-like';
import { useStoryLike } from '@/features/stories/detail/hooks/use-story-like';
import { cn } from '@/lib/utils';

import { useStartChat } from '../hooks/use-start-chat';

type StoryDetailCtaProps = {
  storyId: string;
  canLike: boolean;
  isLiked: boolean;
  /** 선택한 시작 설정 ID. 없으면 백엔드가 첫 시작 설정을 사용한다. */
  startSettingId?: string;
};

export function StoryDetailCta({
  storyId,
  canLike,
  isLiked,
  startSettingId,
}: StoryDetailCtaProps) {
  const [isLikeLoginOpen, setIsLikeLoginOpen] = useState(false);
  const { status } = useSession();
  const { toggleLike, isPending: isLiking } = useStoryLike(storyId, isLiked);
  const { startChat, isStarting, guestLimitTrigger, closeGuestLimitDialog } =
    useStartChat(storyId, startSettingId);

  return (
    <>
      <nav className="shrink-0 bg-inherit px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex w-full items-center gap-1">
          {canLike && (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className={cn(
                'text-foreground',
                isLiked && 'text-destructive hover:text-destructive',
              )}
              aria-label={
                isLiked ? STORY_LIKE_COPY.unlike : STORY_LIKE_COPY.like
              }
              aria-pressed={isLiked}
              aria-busy={isLiking}
              disabled={isLiking || status === 'loading'}
              onClick={() => {
                if (status !== 'authenticated') {
                  setIsLikeLoginOpen(true);

                  return;
                }

                void toggleLike();
              }}>
              {isLiked ? (
                <HeartFilledIcon aria-hidden="true" />
              ) : (
                <HeartOutlineIcon aria-hidden="true" />
              )}
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            className="relative min-w-0 flex-1"
            aria-busy={isStarting}
            disabled={isStarting}
            onClick={startChat}>
            <LoadingButtonContent
              isLoading={isStarting}
              loadingLabel="새 채팅 시작 중">
              새 채팅 시작하기
            </LoadingButtonContent>
          </Button>
        </div>
      </nav>
      <LoginRequiredSheet
        open={
          (isLikeLoginOpen && status === 'unauthenticated') ||
          guestLimitTrigger !== null
        }
        trigger={guestLimitTrigger}
        onOpenChange={(open) => {
          if (!open) {
            setIsLikeLoginOpen(false);
            closeGuestLimitDialog();
          }
        }}
      />
    </>
  );
}
