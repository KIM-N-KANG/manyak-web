'use client';

import { type ReactNode, useState } from 'react';

import { MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * 카드 옵션 다이얼로그의 항목 하나. `confirm`이 있으면 같은 다이얼로그 안에서 확인 화면으로
 * 바뀐 뒤 실행한다 — 창을 닫고 새로 열면 스크림이 두 번 페이드돼 번쩍인다.
 */
export type CardOptionsDialogItem = {
  icon: IconSvgElement;
  label: string;
  onSelect: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
  confirm?: { title: string; description?: string; isPending?: boolean };
};

/**
 * 목록 카드에서 여는 옵션 다이얼로그의 props. 카드는 앵커가 손가락 아래라 드롭다운이 카드를
 * 가리므로 화면 가운데 다이얼로그로 열고, 상단 회색 상자에 그 카드의 축소판을 두어 여러 장 중
 * 무엇을 골랐는지 다이얼로그 안에서 확인하게 한다(앱 `ManyakOptionsDialog`와 같은 구성).
 */
type CardOptionsDialogProps = {
  items: CardOptionsDialogItem[];
  triggerAriaLabel: string;
  /**
   * 어느 카드의 옵션인지 보여 주는 축소판. 상자는 `min-w-0`로 둔다 — 축소판의 `line-clamp`
   * 문단(`-webkit-box`)은 최소 폭을 문장 전체로 계산해, 그리드 항목의 기본 `min-width: auto`가
   * 그대로면 긴 미리보기가 다이얼로그 밖으로 상자를 늘린다.
   */
  preview: ReactNode;
  /** 다이얼로그 접근 가능한 이름. 화면에는 그리지 않는다 */
  title: string;
  /**
   * 트리거 버튼에 덧붙일 클래스. 트리거는 제목 첫 줄 옆에 놓이므로 기본으로 1px 위로 올린다 —
   * 한글 잉크 중심은 줄 상자 중심보다 위에 있고 더보기 아이콘의 점은 뷰박스 중심보다 아래라,
   * 상자 기준으로 맞추면 아이콘이 글자보다 처져 보인다.
   */
  triggerClassName?: string;
};

export function CardOptionsDialog({
  items,
  triggerAriaLabel,
  preview,
  title,
  triggerClassName,
}: CardOptionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);
  const confirmingItem =
    confirmingIndex === null ? null : (items[confirmingIndex] ?? null);
  const isPending = confirmingItem?.confirm?.isPending ?? false;

  const close = () => setOpen(false);

  const openDialog = () => {
    setConfirmingIndex(null);
    setOpen(true);
  };

  const handleSelect = async (item: CardOptionsDialogItem, index: number) => {
    if (item.confirm) {
      setConfirmingIndex(index);

      return;
    }

    close();
    await item.onSelect();
  };

  const handleConfirm = async () => {
    if (confirmingItem) {
      await confirmingItem.onSelect();
    }

    close();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending) {
          return;
        }

        if (nextOpen) {
          openDialog();
        } else {
          close();
        }
      }}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={triggerAriaLabel}
            className={cn('-translate-y-px', triggerClassName)}
          />
        }>
        <HugeiconsIcon icon={MoreVerticalIcon} aria-hidden="true" />
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn('gap-4', confirmingItem && 'gap-6')}>
        {confirmingItem ? (
          <>
            <DialogHeader>
              <DialogTitle>{confirmingItem.confirm?.title}</DialogTitle>
              <DialogDescription>
                {confirmingItem.confirm?.description ??
                  '삭제하면 목록에서 사라지며 되돌릴 수 없어요'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={() => setConfirmingIndex(null)}>
                남겨두기
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="relative"
                disabled={isPending}
                onClick={() => void handleConfirm()}>
                <LoadingButtonContent
                  isLoading={isPending}
                  loadingLabel="삭제 중">
                  {confirmingItem.label}
                </LoadingButtonContent>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogTitle className="sr-only">{title}</DialogTitle>
            <div className="min-w-0 overflow-hidden rounded-lg bg-muted p-2">
              {preview}
            </div>
            <div role="menu" className="flex flex-col">
              {items.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={cn(
                    'flex h-12 items-center gap-3 rounded-md px-2 text-base outline-none hover:bg-accent focus-visible:bg-accent',
                    item.variant === 'destructive' && 'text-destructive',
                  )}
                  onClick={() => void handleSelect(item, index)}>
                  <HugeiconsIcon
                    icon={item.icon}
                    className="size-5"
                    aria-hidden="true"
                  />
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
