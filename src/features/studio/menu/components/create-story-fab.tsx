'use client';

import { type MouseEventHandler } from 'react';
import { createPortal } from 'react-dom';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { m } from 'motion/react';
import Link from 'next/link';

import { useMainScroll } from '@/components/layout/main-scroll-context';
import { APP_PATH } from '@/constants/app-path';

import { CREATE_STORY_FAB_COPY } from '../constants';

type CreateStoryFabProps = {
  onCreate: MouseEventHandler<HTMLAnchorElement>;
};

/**
 * 새 제작 FAB. 스크롤 콘텐츠 밖의 positioned 래퍼에 포털로 붙어 스크롤·당김 새로고침의
 * 이동을 따라가지 않는다.
 */
export function CreateStoryFab({ onCreate }: CreateStoryFabProps) {
  const { hasScrolled, overlayContainer } = useMainScroll();

  if (overlayContainer === null) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-end px-4">
      <Link
        href={APP_PATH.STUDIO.STORY.SIMPLE}
        onClick={onCreate}
        aria-label={CREATE_STORY_FAB_COPY.accessibleLabel}
        className="pointer-events-auto flex h-14 items-center rounded-full bg-primary px-4 text-primary-foreground shadow-md shadow-primary/20 transition-transform outline-none hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:scale-100">
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
            {CREATE_STORY_FAB_COPY.label}
          </span>
        </m.span>
      </Link>
    </div>,
    overlayContainer,
  );
}
