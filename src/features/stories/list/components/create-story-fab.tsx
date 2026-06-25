'use client';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { useMainScroll } from '@/app/(main)/main-scroll-context';
import { APP_PATH } from '@/constants/app-path';
import { ONBOARDING_TARGET } from '@/features/onboarding/constants';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

export function CreateStoryFab() {
  const { hasScrolled } = useMainScroll();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-md justify-end px-4">
      <Link
        href={APP_PATH.CREATOR.STORY}
        data-onborda={ONBOARDING_TARGET.CREATE_STORY}
        onClick={() => track('client_storyList_createButton_clicked')}
        aria-label="스토리 만들기"
        className="pointer-events-auto flex h-14 items-center rounded-full bg-primary px-4 text-primary-foreground shadow-md transition-[filter] outline-none hover:brightness-105 focus-visible:ring-3 focus-visible:ring-ring/50">
        <HugeiconsIcon
          icon={PlusSignIcon}
          className="size-6 shrink-0"
          aria-hidden="true"
        />
        <span
          className={cn(
            'grid transition-[grid-template-columns,margin] duration-300 ease-out',
            hasScrolled ? 'grid-cols-[0fr]' : 'ml-1.5 grid-cols-[1fr]',
          )}>
          <span className="overflow-hidden text-base font-medium whitespace-nowrap">
            만들기
          </span>
        </span>
      </Link>
    </div>
  );
}
