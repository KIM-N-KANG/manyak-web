'use client';

import { useState } from 'react';

import { useSession } from 'next-auth/react';

import { HeartFilledIcon } from '@/components/icons/heart-filled-icon';
import { HeartOutlineIcon } from '@/components/icons/heart-outline-icon';
import { Button } from '@/components/ui/button';
import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { STORY_LIKE_COPY } from '@/features/stories/_shared/constants/story-like';
import { useStoryLike } from '@/features/stories/detail/hooks/use-story-like';
import { cn } from '@/lib/utils';

type StoryDetailCtaProps = {
  storyId: string;
  canLike: boolean;
  isLiked: boolean;
  /** 공개 초기 데이터를 브라우저 조회 응답으로 갱신할 때까지 시작과 좋아요를 막는다. */
  isLoading?: boolean;
  /** 채팅 시작 버튼을 누르면 호출된다. 상세는 채팅 시작 시트를 연다. */
  onStartClick: () => void;
};

export function StoryDetailCta({
  storyId,
  canLike,
  isLiked,
  isLoading = false,
  onStartClick,
}: StoryDetailCtaProps) {
  const [isLikeLoginOpen, setIsLikeLoginOpen] = useState(false);
  const { status } = useSession();
  const { toggleLike, isPending: isLiking } = useStoryLike(storyId, isLiked);

  return (
    <>
      <nav className="shrink-0 bg-inherit px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex w-full items-center gap-4">
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
              disabled={isLiking || isLoading || status === 'loading'}
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
            className="min-w-0 flex-1"
            disabled={isLoading}
            onClick={onStartClick}>
            새 채팅 시작하기
          </Button>
        </div>
      </nav>
      <LoginRequiredSheet
        open={isLikeLoginOpen && status === 'unauthenticated'}
        onOpenChange={setIsLikeLoginOpen}
      />
    </>
  );
}
