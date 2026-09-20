'use client';

import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';

import { STORY_CREATE_GATE_COPY } from '../constants';
import { StoryCreateFunnel } from './story-create-funnel';

export function StoryCreateGate() {
  const { isMember, isGuest } = useMemberAccess();

  if (isMember || isGuest) {
    return <StoryCreateFunnel />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageLoadingSpinner aria-label={STORY_CREATE_GATE_COPY.checking} />
    </div>
  );
}
