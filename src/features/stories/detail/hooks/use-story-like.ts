'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getGetOriginalStoriesQueryKey,
  getGetPublicStoriesQueryKey,
  getGetStoryDetailQueryKey,
  type getStoryDetailResponse,
  useLikeStory,
  useUnlikeStory,
} from '@/api/generated/endpoints/stories/stories';
import { TOAST_MESSAGE } from '@/constants/toast-message';

/**
 * 좋아요 등록·취소 후 상세와 목록의 집계를 갱신한다.
 *
 * @param storyId 좋아요를 변경할 스토리 ID
 * @param isLiked 현재 회원의 좋아요 여부
 * @returns 좋아요 토글 함수와 요청 진행 여부
 */
export function useStoryLike(storyId: string, isLiked: boolean) {
  const queryClient = useQueryClient();
  const like = useLikeStory();
  const unlike = useUnlikeStory();
  const isPending = like.isPending || unlike.isPending;

  const toggleLike = async () => {
    if (isPending) return;

    try {
      const response = await (isLiked ? unlike : like).mutateAsync({ storyId });

      if (response.status !== 204) {
        toast.error(TOAST_MESSAGE.STORY_LIKE_FAILED);

        return;
      }

      queryClient.setQueryData<getStoryDetailResponse>(
        getGetStoryDetailQueryKey(storyId),
        (previous) => {
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
        },
      );
      void queryClient.invalidateQueries({
        queryKey: getGetStoryDetailQueryKey(storyId),
      });
      void queryClient.invalidateQueries({
        queryKey: getGetOriginalStoriesQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getGetPublicStoriesQueryKey(),
      });
    } catch {
      toast.error(TOAST_MESSAGE.STORY_LIKE_FAILED);
    }
  };

  return { toggleLike, isPending };
}
