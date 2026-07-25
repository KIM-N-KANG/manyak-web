import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import Link from 'next/link';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type MyMenuItemBaseProps = {
  icon: IconSvgElement;
  label: string;
  destructive?: boolean;
  /** 오른쪽 끝에 표시하는 현재 상태 문구. */
  trailingText?: string;
};

type MyMenuItemProps = MyMenuItemBaseProps &
  (
    | { href: string; onClick?: never; loading?: never }
    | {
        href?: never;
        onClick: () => void;
        /** 진행 중 여부. true면 오른쪽에 스피너를 표시하고 클릭을 막는다. */
        loading?: boolean;
      }
  );

export function MyMenuItem({
  icon,
  label,
  destructive,
  trailingText,
  href,
  onClick,
  loading,
}: MyMenuItemProps) {
  const className = cn(
    'flex h-12 items-center gap-4 px-4',
    destructive && 'text-destructive',
  );

  const content = (
    <>
      <HugeiconsIcon icon={icon} className="size-6" aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
      {loading && <Spinner className="text-foreground-tertiary" />}
      {trailingText && (
        <span className="text-sm text-foreground-secondary">
          {trailingText}
        </span>
      )}
      {href && (
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="size-5 text-foreground-tertiary"
          aria-hidden="true"
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={loading}>
      {content}
    </button>
  );
}
