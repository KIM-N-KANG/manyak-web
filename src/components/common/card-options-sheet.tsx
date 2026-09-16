'use client';

import { useState } from 'react';

import { MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import type { VariantProps } from 'class-variance-authority';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { OptionMenuButton } from '@/components/common/option-menu-button';
import { Button, type buttonVariants } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { cn } from '@/lib/utils';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

/**
 * 카드 옵션 시트의 항목 하나. `confirm`이 있으면 같은 시트 안에서 확인 화면으로
 * 바뀐 뒤 실행한다 — 시트를 닫고 새로 열면 스크림이 두 번 페이드돼 번쩍인다.
 */
export type CardOptionsSheetItem = {
  icon: IconSvgElement;
  label: string;
  onSelect: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
  confirm?: { title: string; description?: string; isPending?: boolean };
};

/**
 * 목록 카드에서 여는 옵션 바텀 시트의 props. 카드는 앵커가 손가락 아래라 드롭다운이 카드를
 * 가리므로 바텀 시트로 열고, 머리글에 카드 종류와 제목을 두어 여러 장 중 무엇을 골랐는지
 * 시트 안에서 확인하게 한다.
 */
type CardOptionsSheetProps = {
  items: CardOptionsSheetItem[];
  triggerAriaLabel: string;
  /** 제목 위에 작게 표시하는 카드 종류(예: "채팅", "내가 만든 스토리") */
  kind: string;
  /** 선택한 카드의 제목. 시트의 접근 가능한 이름이기도 하다 */
  title: string;
  /** 트리거 버튼 크기. 기본 `icon-xs`는 카드 제목 줄 옆에 놓는 크기다 */
  triggerSize?: ButtonSize;
  /**
   * 트리거 버튼에 덧붙일 클래스. 기본 크기의 트리거는 제목 첫 줄 옆에 놓이므로 1px 위로 올린다 —
   * 한글 잉크 중심은 줄 상자 중심보다 위에 있고 더보기 아이콘의 점은 뷰박스 중심보다 아래라,
   * 상자 기준으로 맞추면 아이콘이 글자보다 처져 보인다.
   */
  triggerClassName?: string;
};

export function CardOptionsSheet({
  items,
  triggerAriaLabel,
  kind,
  title,
  triggerSize = 'icon-xs',
  triggerClassName,
}: CardOptionsSheetProps) {
  const container = useAppFrameContainer();
  const [open, setOpen] = useState(false);
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);
  const confirmingItem =
    confirmingIndex === null ? null : (items[confirmingIndex] ?? null);
  const isPending = confirmingItem?.confirm?.isPending ?? false;

  const close = () => setOpen(false);

  const openSheet = () => {
    setConfirmingIndex(null);
    setOpen(true);
  };

  const handleSelect = async (item: CardOptionsSheetItem, index: number) => {
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
    <Drawer
      open={open && container !== null}
      disablePointerDismissal={isPending}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          openSheet();
        } else {
          close();
        }
      }}>
      <DrawerTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={triggerSize}
            aria-label={triggerAriaLabel}
            className={cn(
              triggerSize === 'icon-xs' && '-translate-y-px',
              triggerClassName,
            )}
          />
        }>
        <HugeiconsIcon icon={MoreVerticalIcon} aria-hidden="true" />
      </DrawerTrigger>
      <DrawerContent container={container} className="text-base">
        {confirmingItem ? (
          <>
            <DrawerHeader className="gap-2 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
              <DrawerTitle className="text-xl leading-snug font-bold">
                {confirmingItem.confirm?.title}
              </DrawerTitle>
              <DrawerDescription>
                {confirmingItem.confirm?.description ??
                  '삭제하면 목록에서 사라지며 되돌릴 수 없어요'}
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="mt-6 flex-row pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                disabled={isPending}
                onClick={() => setConfirmingIndex(null)}>
                남겨두기
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="relative flex-1"
                disabled={isPending}
                onClick={() => void handleConfirm()}>
                <LoadingButtonContent
                  isLoading={isPending}
                  loadingLabel="삭제 중">
                  {confirmingItem.label}
                </LoadingButtonContent>
              </Button>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerHeader className="gap-2 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
              <p className="text-base leading-6 text-foreground-secondary">
                {kind}
              </p>
              <DrawerTitle className="truncate text-xl leading-snug font-bold">
                {title}
              </DrawerTitle>
            </DrawerHeader>
            <div
              role="menu"
              className="flex flex-col p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {items.map((item, index) => (
                <OptionMenuButton
                  key={item.label}
                  role="menuitem"
                  icon={item.icon}
                  label={item.label}
                  variant={item.variant}
                  onClick={() => void handleSelect(item, index)}
                />
              ))}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
