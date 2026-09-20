import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const sessionStorageStub = {
  getItem: (key: string) =>
    store.has(key) ? (store.get(key) as string) : null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal('window', { sessionStorage: sessionStorageStub });
});

afterEach(() => vi.unstubAllGlobals());

import {
  clearPendingLogin,
  hasPendingLogin,
  markPendingLogin,
  PENDING_LOGIN_STORAGE_KEY,
} from '@/features/auth/_shared/utils/pending-login-storage';

describe('pending-login-storage', () => {
  it('표시 전에는 진행 중 로그인이 없다', () => {
    expect(hasPendingLogin()).toBe(false);
  });

  it('표시하면 같은 탭 저장소에서 읽히고 지우면 사라진다', () => {
    markPendingLogin();
    expect(hasPendingLogin()).toBe(true);
    expect(store.has(PENDING_LOGIN_STORAGE_KEY)).toBe(true);

    clearPendingLogin();
    expect(hasPendingLogin()).toBe(false);
  });

  it('저장소 접근이 막힌 환경에서는 예외 없이 없음으로 판정한다', () => {
    vi.stubGlobal('window', {
      get sessionStorage(): Storage {
        throw new Error('blocked');
      },
    });

    expect(() => markPendingLogin()).not.toThrow();
    expect(hasPendingLogin()).toBe(false);
  });

  it('브라우저 밖(SSR)에서는 아무것도 하지 않는다', () => {
    vi.unstubAllGlobals();

    expect(() => markPendingLogin()).not.toThrow();
    expect(hasPendingLogin()).toBe(false);
  });
});
