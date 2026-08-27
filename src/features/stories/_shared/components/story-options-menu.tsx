'use client';

import { Delete02Icon } from '@hugeicons/core-free-icons';
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
} from '@/features/stories/_shared/utils/story-id-storage';
import { useOptimisticCreatedResourceDelete } from '@/hooks/use-optimistic-created-resource-delete';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

type StoryOptionsMenuProps = {
  storyId: string;
  size?: ButtonSize;
  triggerClassName?: string;
};

export function StoryOptionsMenu({
  storyId,
  size = 'icon-xs',
  triggerClassName,
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
  });

  return (
    <OptionsMenu
      triggerAriaLabel="스토리 옵션 더보기"
      size={size}
      triggerClassName={triggerClassName}
      items={[
        {
          icon: Delete02Icon,
          label: '삭제하기',
          variant: 'destructive',
          onSelect: handleDelete,
          confirm: { title: '스토리를 삭제할까요?', isPending },
        },
      ]}
    />
  );
}
