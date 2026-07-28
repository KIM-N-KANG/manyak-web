'use client';

import { type ReactNode, useState } from 'react';

import { Delete02Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { VariantProps } from 'class-variance-authority';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, type buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

type OptionsMenuProps = {
  onDelete: () => void | Promise<void>;
  isDeleting?: boolean;
  triggerAriaLabel: string;
  confirmTitle: string;
  deleteLabel?: string;
  size?: ButtonSize;
  triggerClassName?: string;
  /** 삭제 항목 위에 렌더되는 추가 메뉴 항목. */
  additionalItems?: ReactNode;
};

export function OptionsMenu({
  onDelete,
  isDeleting = false,
  triggerAriaLabel,
  confirmTitle,
  deleteLabel = '삭제하기',
  size = 'icon-xs',
  triggerClassName,
  additionalItems,
}: OptionsMenuProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleConfirmDelete = async () => {
    await onDelete();
    setIsConfirmOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size={size}
              aria-label={triggerAriaLabel}
              className={triggerClassName}
            />
          }>
          <HugeiconsIcon icon={MoreVerticalIcon} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {additionalItems}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setIsConfirmOpen(true)}>
            <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" />
            {deleteLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (isDeleting) {
            return;
          }

          setIsConfirmOpen(open);
        }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              삭제하면 목록에서 사라지며 되돌릴 수 없어요
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              남겨두기
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              className="relative"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}>
              <LoadingButtonContent
                isLoading={isDeleting}
                loadingLabel="삭제 중">
                삭제하기
              </LoadingButtonContent>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
