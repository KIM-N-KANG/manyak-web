'use client';

import Link from 'next/link';

import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { track } from '@/observability/analytics';

import { STORY_MODE_SELECT_COPY } from '../constants';
import {
  GeneralCreateIllustration,
  SimpleCreateIllustration,
} from './create-story-mode-illustrations';

const MODE_OPTIONS = [
  {
    method: 'simple',
    href: APP_PATH.STUDIO.STORY.SIMPLE,
    copy: STORY_MODE_SELECT_COPY.simple,
    Illustration: SimpleCreateIllustration,
  },
  {
    method: 'general',
    href: APP_PATH.STUDIO.STORY.GENERAL,
    copy: STORY_MODE_SELECT_COPY.general,
    Illustration: GeneralCreateIllustration,
  },
] as const;

export function StoryModeSelectScreen() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={STORY_MODE_SELECT_COPY.title}
        fallbackHref={APP_PATH.MAIN.STUDIO}
      />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 break-keep">
        <div className="grid gap-1">
          {MODE_OPTIONS.map(({ method, href, copy, Illustration }) => (
            <Link
              key={method}
              href={href}
              onClick={() =>
                track('client_storyCreate_methodOption_selected', { method })
              }
              className="grid gap-3.5 rounded-xl px-2 pt-2 pb-4 transition-colors duration-250 ease-[cubic-bezier(.2,.8,.2,1)] outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none">
              <Illustration />
              <div className="px-1">
                <p className="text-[17px] font-semibold tracking-tight">
                  {copy.title}
                </p>
                <p className="mt-1 text-sm text-pretty text-foreground-secondary">
                  {copy.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
