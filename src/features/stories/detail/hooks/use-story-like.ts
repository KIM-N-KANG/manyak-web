'use client';

import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getGetPublicStoriesQueryKey,
  getGetStoryDetailQueryKey,
  type getStoryDetailResponse,
  useLikeStory,
  useUnlikeStory,
} from '@/api/generated/endpoints/stories/stories';
import { TOAST_MESSAGE } from '@/constants/toast-message';

/**
 * 좋아요를 즉시 반영하고 실패하면 복원하며 성공하면 서버 집계를 갱신한다.
 *
 * @param storyId 좋아요를 변경할 스토리 ID
 * @param isLiked 현재 회원의 좋아요 여부
 * @returns 좋아요 토글 함수와 요청 진행 여부
 */
export function useStoryLike(storyId: string, isLiked: boolean) {
  const queryClient = useQueryClient();
  const like = useLikeStory();
  const unlike = useUnlikeStory();
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);

  const toggleLike = async () => {
    if (pendingRef.current) return;

    pendingRef.current = true;
    setIsPending(true);

    const queryKey = getGetStoryDetailQueryKey(storyId);
    let previous: getStoryDetailResponse | undefined;

    try {
      await queryClient.cancelQueries({ queryKey });
      previous = queryClient.getQueryData<getStoryDetailResponse>(queryKey);

      queryClient.setQueryData<getStoryDetailResponse>(queryKey, (previous) => {
        if (previous?.status !== 200) return previous;

        return {
          ...previous,
          data: {
            ...previous.data,
            isLiked: !isLiked,
            likeCount: Math.max(
              0,
              (previous.data.likeCount ?? 0) + (isLiked ? -1 : 1),
            ),
          },
        };
      });

      const response = await (isLiked ? unlike : like).mutateAsync({ storyId });

      if (response.status !== 204) {
        throw new Error('Unexpected story like response');
      }
    } catch {
      if (previous) queryClient.setQueryData(queryKey, previous);

      toast.error(TOAST_MESSAGE.STORY_LIKE_FAILED);

      return;
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }

    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({
      queryKey: getGetPublicStoriesQueryKey(),
    });
  };

  return { toggleLike, isPending };
}
