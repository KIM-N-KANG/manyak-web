'use client';

import { useState } from 'react';

import Link from 'next/link';

import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { cn } from '@/lib/utils';
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

/**
 * 선택지 카드 한 장의 높이 범위. 카드는 남는 높이를 반씩 채우되 iPhone SE(375×667)에서 헤더(3.5rem) 아래가
 * 스크롤 없이 딱 차는 높이(아래 여백 1rem + 카드 간격 1rem)부터, Pixel 10(412×924)에서 위 1rem·아래 2rem 여백이
 * 남는 높이(여백 3rem + 카드 간격 1rem)까지만 늘어난다. 남는 높이는 두 카드 묶음을 가운데에 두어 위아래로 나눈다.
 */
const OPTION_HEIGHT =
  'min-h-[calc((667px-3.5rem-2rem)/2)] max-h-[calc((924px-3.5rem-4rem)/2)]';

export function StoryModeSelectScreen() {
  const { isGuest } = useMemberAccess();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={STORY_MODE_SELECT_COPY.title}
        fallbackHref={APP_PATH.MAIN.STUDIO}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-4 break-keep">
        <div className="flex flex-1 flex-col justify-center gap-4">
          {MODE_OPTIONS.map(({ method, href, copy, Illustration }) => (
            <Link
              key={method}
              href={href}
              onClick={(event) => {
                track('client_storyCreate_methodOption_selected', { method });

                // 일반 제작은 회원 전용이라 게스트는 이동하지 않고 로그인을 먼저 받는다.
                if (method === 'general' && isGuest) {
                  event.preventDefault();
                  setIsLoginOpen(true);
                }
              }}
              className={cn(
                OPTION_HEIGHT,
                'flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors duration-250 ease-[cubic-bezier(.2,.8,.2,1)] outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none',
              )}>
              <Illustration />
              <div className="border-t border-border px-4 py-3.5">
                <p className="leading-6 font-semibold">{copy.title}</p>
                <p className="mt-1 text-sm leading-5 text-foreground-secondary">
                  {copy.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <LoginRequiredSheet open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </div>
  );
}
