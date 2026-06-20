'use client';

import { Delete02Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons';
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

type ChatOptionsMenuProps = {
  chatId: number;
  size?: ButtonSize;
  triggerClassName?: string;
};

export function ChatOptionsMenu({
  chatId,
  size = 'icon-xs',
  triggerClassName,
}: ChatOptionsMenuProps) {
  /** @todo 채팅 삭제 API 연동 */
  const handleDelete = () => {
    void chatId;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={size}
            aria-label="채팅 옵션 더보기"
            className={triggerClassName}
          />
        }>
        <HugeiconsIcon icon={MoreVerticalIcon} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
          <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
          삭제하기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
