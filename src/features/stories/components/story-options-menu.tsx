'use client';

import type { VariantProps } from 'class-variance-authority';

import { useDeleteStory } from '@/api/generated/endpoints/stories/stories';
import { OptionsMenu } from '@/components/common/options-menu';
import type { buttonVariants } from '@/components/ui/button';
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
};

export function StoryOptionsMenu({
  storyId,
  size = 'icon-xs',
  triggerClassName,
}: StoryOptionsMenuProps) {
  const { mutateAsync, isPending } = useDeleteStory();

  const handleDelete = async () => {
    const previousStoryIds = parseCreatedStoryIds(getCreatedStoryIdsSnapshot());

    removeCreatedStoryId(storyId);

    try {
      await mutateAsync({ storyId });
    } catch (error) {
      if (error instanceof FetchError && error.status === 404) {
        return;
      }

      writeCreatedStoryIds(previousStoryIds);
      window.alert('스토리를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
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
