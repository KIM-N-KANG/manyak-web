'use client';

import {
  BubbleChatIcon,
  Delete02Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { VariantProps } from 'class-variance-authority';

import { Button, type buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  /** @todo 채팅 시작/수정/삭제 라우트·API 연동 */
  const handleStartChat = () => {
    void storyId;
  };
  const handleEdit = () => {
    void storyId;
  };
  const handleDelete = () => {
    void storyId;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={size}
            aria-label="스토리 옵션 더보기"
            className={triggerClassName}
          />
        }>
        <HugeiconsIcon icon={MoreVerticalIcon} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleStartChat}>
          <HugeiconsIcon icon={BubbleChatIcon} aria-hidden="true" />
          채팅 시작하기
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          <HugeiconsIcon icon={PencilEdit02Icon} aria-hidden="true" />
          수정하기
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
          삭제하기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
