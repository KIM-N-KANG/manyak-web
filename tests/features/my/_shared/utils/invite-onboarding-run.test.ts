import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  INVITE_ONBOARDING_SEEN_STORAGE_KEY,
  shouldDeferInviteOnboarding,
} from '@/features/my/_shared/utils/invite-onboarding-run';

function createStorage() {
  const store = new Map<string, string>();

  return {
    store,
    getItem: (key: string) =>
      store.has(key) ? (store.get(key) as string) : null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

let localStorage = createStorage();
let sessionStorage = createStorage();

/** 탭을 닫고 다시 연 접속을 흉내 낸다. 기기 저장소는 남고 탭 저장소만 비운다. */
function openNextRun() {
  sessionStorage = createStorage();
  vi.stubGlobal('window', { localStorage, sessionStorage });
}

beforeEach(() => {
  localStorage = createStorage();
  sessionStorage = createStorage();
  vi.stubGlobal('window', { localStorage, sessionStorage });
});

afterEach(() => vi.unstubAllGlobals());

describe('shouldDeferInviteOnboarding', () => {
  it('가입한 접속에서는 새로고침해도 미루고, 다음 접속에서는 미루지 않는다', () => {
    expect(shouldDeferInviteOnboarding('user-1')).toBe(true);
    expect(shouldDeferInviteOnboarding('user-1')).toBe(true);

    openNextRun();

    expect(shouldDeferInviteOnboarding('user-1')).toBe(false);
    expect(shouldDeferInviteOnboarding('user-1')).toBe(false);
  });

  it('다른 회원의 대기를 처음 보면 그 접속을 새 회원의 가입한 접속으로 본다', () => {
    localStorage.store.set(INVITE_ONBOARDING_SEEN_STORAGE_KEY, 'user-1');

    expect(shouldDeferInviteOnboarding('user-2')).toBe(true);

    openNextRun();

    expect(shouldDeferInviteOnboarding('user-2')).toBe(false);
  });

  it('저장소 접근이 막히면 미루지 않는다', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('blocked');
      },
      get sessionStorage(): Storage {
        throw new Error('blocked');
      },
    });

    expect(shouldDeferInviteOnboarding('user-1')).toBe(false);
  });
});
