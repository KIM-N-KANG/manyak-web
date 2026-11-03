'use client';

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import { Button } from '@/components/ui/button';

type TurnActionButtonProps = {
  icon: IconSvgElement;
  label: string;
  disabled?: boolean;
  onClick: () => void;
};

/** 턴 아래의 아이콘 버튼. 다시 생성, 입력 수정, 포크가 함께 쓴다. */
export function TurnActionButton({
  icon,
  label,
  disabled,
  onClick,
}: TurnActionButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className="text-foreground-secondary"
      disabled={disabled}
      onClick={onClick}>
      <HugeiconsIcon icon={icon} aria-hidden="true" />
    </Button>
  );
}
