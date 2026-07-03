'use client';

import type { VariantProps } from 'class-variance-authority';

import { useDeleteStory } from '@/api/generated/endpoints/stories/stories';
import { OptionsMenu } from '@/components/common/options-menu';
import type { buttonVariants } from '@/components/ui/button';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  getCreatedStoryIdsSnapshot,
  parseCreatedStoryIds,
  removeCreatedStoryId,
  writeCreatedStoryIds,
} from '@/features/stories/new/utils/story-id-storage';
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
  const { mutateAsync, isPending } = useDeleteStory();
  const handleDelete = useOptimisticCreatedResourceDelete({
    id: storyId,
    getSnapshot: getCreatedStoryIdsSnapshot,
    parseSnapshot: parseCreatedStoryIds,
    removeId: removeCreatedStoryId,
    writeIds: writeCreatedStoryIds,
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
