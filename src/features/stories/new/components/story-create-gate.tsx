'use client';

import { useState } from 'react';

import { ListStatus } from '@/components/common/list-status';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { BackHeader } from '@/components/layout/back-header';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';

import { STORY_CREATE_GATE_COPY } from '../constants';
import { StoryCreateFunnel } from './story-create-funnel';

function StoryCreateLoginRequired() {
  const [isSheetOpen, setIsSheetOpen] = useState(true);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={STORY_CREATE_GATE_COPY.title}
        fallbackHref={APP_PATH.MAIN.STUDIO}
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <ListStatus
          title={LOGIN_COPY.title}
          description={LOGIN_COPY.linkNotice}>
          <Button type="button" size="lg" onClick={() => setIsSheetOpen(true)}>
            {LOGIN_COPY.loginButton}
          </Button>
        </ListStatus>
      </main>
      <LoginRequiredSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </div>
  );
}

export function StoryCreateGate() {
  const { isMember, isGuest } = useMemberAccess();

  if (isMember) {
    return <StoryCreateFunnel />;
  }

  if (isGuest) {
    return <StoryCreateLoginRequired />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageLoadingSpinner aria-label={STORY_CREATE_GATE_COPY.checking} />
    </div>
  );
}
