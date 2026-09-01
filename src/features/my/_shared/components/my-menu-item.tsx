import { ArrowRight01Icon, LinkSquare01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import Link from 'next/link';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type MyMenuItemBaseProps = {
  icon: IconSvgElement;
  label: string;
  destructive?: boolean;
  /** 라벨 아래에 강조색으로 덧붙이는 보조 문구. 라벨과 이어 읽히는 한 문장으로 쓴다. */
  subLabel?: string;
  /** 오른쪽 끝에 표시하는 현재 상태 문구. */
  trailingText?: string;
};

type MyMenuItemProps = MyMenuItemBaseProps &
  (
    | {
        href: string;
        onClick?: never;
        loading?: never;
        /** 링크를 새 브라우저 탭에서 여는지 여부다. */
        newTab?: boolean;
      }
    | {
        href?: never;
        onClick: () => void;
        /** 진행 중 여부. true면 오른쪽에 스피너를 표시하고 클릭을 막는다. */
        loading?: boolean;
        newTab?: never;
      }
  );

export function MyMenuItem({
  icon,
  label,
  destructive,
  subLabel,
  trailingText,
  href,
  onClick,
  loading,
  newTab,
}: MyMenuItemProps) {
  const className = cn(
    'flex min-h-12 items-center gap-4 px-4 py-2',
    destructive && 'text-destructive',
  );

  const content = (
    <>
      <HugeiconsIcon icon={icon} className="size-6" aria-hidden="true" />
      <span className="flex flex-1 flex-col text-left">
        {label}
        {subLabel && (
          <span className="text-xs font-medium text-primary">{subLabel}</span>
        )}
      </span>
      {loading && <Spinner className="text-foreground-tertiary" />}
      {trailingText && (
        <span className="text-sm text-foreground-secondary">
          {trailingText}
        </span>
      )}
      {href && (
        <HugeiconsIcon
          icon={newTab ? LinkSquare01Icon : ArrowRight01Icon}
          className="size-5 text-foreground-tertiary"
          aria-hidden="true"
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noopener noreferrer' : undefined}>
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
