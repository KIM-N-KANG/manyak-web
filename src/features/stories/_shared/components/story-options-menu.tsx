'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { VariantProps } from 'class-variance-authority';
import { useSession } from 'next-auth/react';

import { useDeleteStory } from '@/api/generated/endpoints/stories/stories';
import { getGetMyStoriesQueryKey } from '@/api/generated/endpoints/users/users';
import { OptionsMenu } from '@/components/common/options-menu';
import type { buttonVariants } from '@/components/ui/button';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  getCreatedStoryIdsSnapshot,
  parseCreatedStoryIds,
  removeCreatedStoryId,
  writeCreatedStoryIds,
} from '@/features/stories/list/utils/story-id-storage';
import { useOptimisticCreatedResourceDelete } from '@/hooks/use-optimistic-created-resource-delete';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

type StoryOptionsMenuProps = {
  storyId: string;
  size?: ButtonSize;
  triggerClassName?: string;
  onDeleteSuccess?: () => void;
};

export function StoryOptionsMenu({
  storyId,
  size = 'icon-xs',
  triggerClassName,
  onDeleteSuccess,
}: StoryOptionsMenuProps) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useDeleteStory();
  const handleDelete = useOptimisticCreatedResourceDelete({
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

  return (
    <OptionsMenu
      onDelete={handleDelete}
      isDeleting={isPending}
      triggerAriaLabel="스토리 옵션 더보기"
      confirmTitle="스토리를 삭제할까요?"
      size={size}
      triggerClassName={triggerClassName}
    />
  );
}
