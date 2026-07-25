import { describe, expect, it } from 'vitest';

import { resolveOnboardingGate } from '@/features/onboarding/utils/onboarding-gate';

const NEW_VISITOR = {
  sessionStatus: 'unauthenticated',
  storyIds: [],
  chatIds: [],
  hasSeenOnboarding: false,
} as const;

describe('resolveOnboardingGate', () => {
  it('생성 이력이 없는 미열람 게스트는 노출 대상이다', () => {
    expect(resolveOnboardingGate(NEW_VISITOR)).toBe('eligible');
  });

  it('세션이 확정되지 않았으면 판정을 미룬다', () => {
    expect(
      resolveOnboardingGate({ ...NEW_VISITOR, sessionStatus: 'loading' }),
    ).toBe('pending');
  });

  it('로컬스토리지를 아직 읽지 못했으면 판정을 미룬다', () => {
    expect(resolveOnboardingGate({ ...NEW_VISITOR, storyIds: null })).toBe(
      'pending',
    );
    expect(resolveOnboardingGate({ ...NEW_VISITOR, chatIds: null })).toBe(
      'pending',
    );
  });

  it('회원은 노출 대상이 아니다', () => {
    expect(
      resolveOnboardingGate({ ...NEW_VISITOR, sessionStatus: 'authenticated' }),
    ).toBe('ineligible');
  });

  it('이미 열람했으면 노출 대상이 아니다', () => {
    expect(
      resolveOnboardingGate({ ...NEW_VISITOR, hasSeenOnboarding: true }),
    ).toBe('ineligible');
  });

  it('만든 스토리나 채팅이 있으면 노출 대상이 아니다', () => {
    expect(resolveOnboardingGate({ ...NEW_VISITOR, storyIds: ['s1'] })).toBe(
      'ineligible',
    );
    expect(resolveOnboardingGate({ ...NEW_VISITOR, chatIds: ['c1'] })).toBe(
      'ineligible',
    );
  });

  it('회원이면 로컬스토리지를 읽기 전이라도 즉시 제외한다', () => {
    expect(
      resolveOnboardingGate({
        ...NEW_VISITOR,
        sessionStatus: 'authenticated',
        storyIds: null,
        chatIds: null,
      }),
    ).toBe('ineligible');
  });
});
