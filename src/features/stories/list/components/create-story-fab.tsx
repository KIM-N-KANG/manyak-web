'use client';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';
import Link from 'next/link';

import { useMainScroll } from '@/app/(main)/main-scroll-context';
import { APP_PATH } from '@/constants/app-path';
import { track } from '@/observability/analytics';

export function CreateStoryFab() {
  const { hasScrolled } = useMainScroll();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md justify-end px-4">
      <Link
        href={APP_PATH.CREATOR.STORY}
        onClick={() =>
          track('client_storyList_createButton_clicked', { source: 'fab' })
        }
        aria-label="스토리 만들기"
        className="pointer-events-auto flex h-14 items-center rounded-full bg-primary px-4 text-primary-foreground shadow-md shadow-primary/20 transition-[filter] outline-none hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-ring/50">
        <HugeiconsIcon
          icon={PlusSignIcon}
          className="size-6 shrink-0"
          aria-hidden="true"
        />
        <m.span
          initial={false}
          animate={{
            width: hasScrolled ? 0 : 'auto',
            marginLeft: hasScrolled ? 0 : 6,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="inline-flex overflow-hidden">
          <span className="mr-1 text-base font-medium whitespace-nowrap">
            만들기
          </span>
        </m.span>
      </Link>
    </div>
  );
}
