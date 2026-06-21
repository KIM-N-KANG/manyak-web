'use client';

import type { VariantProps } from 'class-variance-authority';
import { toast } from 'sonner';

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
import { FetchError } from '@/lib/custom-fetch';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

type StoryOptionsMenuProps = {
  storyId: number;
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

  const handleDelete = async () => {
    const previousStoryIds = parseCreatedStoryIds(getCreatedStoryIdsSnapshot());

    removeCreatedStoryId(storyId);

    try {
      await mutateAsync({ storyId });
      toast.success(TOAST_MESSAGE.STORY_DELETED);
      onDeleteSuccess?.();
    } catch (error) {
      if (error instanceof FetchError && error.status === 404) {
        onDeleteSuccess?.();

        return;
      }

      writeCreatedStoryIds(previousStoryIds);
      toast.error(TOAST_MESSAGE.STORY_DELETE_FAILED);
    }
  };

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
