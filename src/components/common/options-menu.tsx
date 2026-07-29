'use client';

import { Fragment, useState } from 'react';

import { MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

/**
 * 더보기 메뉴의 항목 하나. `confirm`이 있으면 실행 전에 확인 다이얼로그를 띄운다.
 *
 * 확인 다이얼로그는 메뉴 팝업 안이 아니라 형제로 렌더해야 한다. Base UI의
 * Menu.Popup은 닫힐 때 내부를 언마운트하므로, 팝업 안에 두면 항목을 누르는 순간
 * 메뉴가 닫히면서 다이얼로그도 함께 사라진다. 그래서 항목이 다이얼로그를 직접
 * 들지 않고 이 필드로 선언만 하며, 렌더는 OptionsMenu가 대신한다.
 */
export type OptionsMenuItem = {
  icon: IconSvgElement;
  label: string;
  onSelect: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  /** true면 이 항목 앞에 구분선을 렌더한다. */
  separatorBefore?: boolean;
  confirm?: { title: string; description?: string; isPending?: boolean };
};

type OptionsMenuProps = {
  items: OptionsMenuItem[];
  triggerAriaLabel: string;
  size?: ButtonSize;
  triggerClassName?: string;
};

export function OptionsMenu({
  items,
  triggerAriaLabel,
  size = 'icon-xs',
  triggerClassName,
}: OptionsMenuProps) {
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);
  const confirmingItem =
    confirmingIndex === null ? null : (items[confirmingIndex] ?? null);
  const isPending = confirmingItem?.confirm?.isPending ?? false;

  const handleConfirm = async () => {
    if (confirmingItem) {
      await confirmingItem.onSelect();
    }

    setConfirmingIndex(null);
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
          {items.map((item, index) => (
            <Fragment key={item.label}>
              {item.separatorBefore ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                variant={item.variant}
                disabled={item.disabled}
                onClick={() => {
                  if (item.confirm) {
                    setConfirmingIndex(index);

                    return;
                  }

                  void item.onSelect();
                }}>
                <HugeiconsIcon icon={item.icon} aria-hidden="true" />
                {item.label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmingItem !== null}
        onOpenChange={(open) => {
          if (isPending) {
            return;
          }

          if (!open) {
            setConfirmingIndex(null);
          }
        }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmingItem?.confirm?.title ?? ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingItem?.confirm?.description ??
                '삭제하면 목록에서 사라지며 되돌릴 수 없어요'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>남겨두기</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              className="relative"
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirm();
              }}>
              <LoadingButtonContent
                isLoading={isPending}
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
