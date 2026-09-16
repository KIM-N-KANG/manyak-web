import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type OptionMenuButtonProps = {
  icon: IconSvgElement;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  /** 진행 중 여부. true면 오른쪽에 스피너를 표시하고 클릭을 막는다. */
  loading?: boolean;
  disabled?: boolean;
  role?: 'menuitem';
};

export function OptionMenuButton({
  icon,
  label,
  onClick,
  variant = 'default',
  loading,
  disabled,
  role,
}: OptionMenuButtonProps) {
  return (
    <button
      type="button"
      role={role}
      className={cn(
        'flex h-12 items-center gap-3 rounded-md px-2 text-base outline-none hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none',
        variant === 'destructive' && 'text-destructive',
      )}
      disabled={disabled || loading}
      onClick={onClick}>
      <HugeiconsIcon icon={icon} className="size-5" aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
      {loading && <Spinner className="text-foreground-tertiary" />}
    </button>
  );
}
