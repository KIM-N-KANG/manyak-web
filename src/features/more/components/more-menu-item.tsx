import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

type MoreMenuItemBaseProps = {
  icon: IconSvgElement;
  label: string;
  destructive?: boolean;
};

type MoreMenuItemProps = MoreMenuItemBaseProps &
  ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

export function MoreMenuItem({
  icon,
  label,
  destructive,
  href,
  onClick,
}: MoreMenuItemProps) {
  const className = cn(
    'flex h-12 items-center gap-4 px-4',
    destructive && 'text-destructive',
  );

  const content = (
    <>
      <HugeiconsIcon icon={icon} className="size-6" aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
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
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}
