import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) =>
    store.has(key) ? (store.get(key) as string) : null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal('window', { localStorage: localStorageStub });
});

afterEach(() => vi.unstubAllGlobals());

import {
  clearPendingHandoff,
  PENDING_HANDOFF_STORAGE_KEY,
  type PendingHandoff,
  readPendingHandoff,
  savePendingHandoff,
} from '@/features/auth/_shared/utils/pending-handoff-storage';

const SAMPLE: PendingHandoff = {
  code: 'handoff-code',
  handoffId: 'handoff-id',
  storyIds: ['s1', 's2'],
  chatIds: ['c1'],
};

describe('pending-handoff-storage', () => {
  it('저장한 핸드오프를 그대로 읽어온다', () => {
    savePendingHandoff(SAMPLE);
    expect(readPendingHandoff()).toEqual(SAMPLE);
  });

  it('저장된 값이 없으면 null을 반환한다', () => {
    expect(readPendingHandoff()).toBeNull();
  });

  it('clearPendingHandoff 후에는 null을 반환한다', () => {
    savePendingHandoff(SAMPLE);
    clearPendingHandoff();
    expect(readPendingHandoff()).toBeNull();
  });

  it('손상된 JSON이 저장돼 있으면 null을 반환한다', () => {
    store.set(PENDING_HANDOFF_STORAGE_KEY, '{broken');
    expect(readPendingHandoff()).toBeNull();
  });

  it('형태가 어긋난 객체가 저장돼 있으면 null을 반환한다', () => {
    store.set(
      PENDING_HANDOFF_STORAGE_KEY,
      JSON.stringify({ code: 'x', storyIds: 'not-array' }),
    );
    expect(readPendingHandoff()).toBeNull();
  });
});
