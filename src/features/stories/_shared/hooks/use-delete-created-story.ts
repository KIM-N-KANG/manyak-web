'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { useDeleteStory } from '@/api/generated/endpoints/stories/stories';
import { getGetMyStoriesQueryKey } from '@/api/generated/endpoints/users/users';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  getCreatedStoryIdsSnapshot,
  parseCreatedStoryIds,
  removeCreatedStoryId,
  writeCreatedStoryIds,
} from '@/features/stories/_shared/utils/story-id-storage';
import { useOptimisticCreatedResourceDelete } from '@/hooks/use-optimistic-created-resource-delete';

/**
 * 내가 만든 스토리를 삭제하는 핸들러와 진행 상태를 반환하는 훅.
 * 제작 목록 카드와 상세 헤더 메뉴가 같은 절차(낙관 삭제·롤백·토스트)를 공유한다.
 *
 * @param storyId 삭제할 스토리 ID
 * @param onDeleteSuccess 삭제(또는 이미 삭제됨 404)가 확정된 뒤 실행할 콜백
 * @returns 삭제 핸들러와 서버 요청 진행 여부
 */
export function useDeleteCreatedStory(
  storyId: string,
  onDeleteSuccess?: () => void,
) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useDeleteStory();
  const deleteStory = useOptimisticCreatedResourceDelete({
    id: storyId,
    isGuest: status !== 'authenticated',
    getSnapshot: getCreatedStoryIdsSnapshot,
    parseSnapshot: parseCreatedStoryIds,
    removeId: removeCreatedStoryId,
    writeIds: writeCreatedStoryIds,
    invalidateServerLists: () =>
      void queryClient.invalidateQueries({
        queryKey: getGetMyStoriesQueryKey(),
      }),
    deleteResource: () => mutateAsync({ storyId }),
    successMessage: TOAST_MESSAGE.STORY_DELETED,
    failureMessage: TOAST_MESSAGE.STORY_DELETE_FAILED,
    onDeleteSuccess,
  });

  return { deleteStory, isPending };
}
