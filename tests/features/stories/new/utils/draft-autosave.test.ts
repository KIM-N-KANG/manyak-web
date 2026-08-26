import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDraftAutosave,
  DRAFT_AUTOSAVE_DELAY_MS,
  type DraftSaveStatus,
} from '@/features/stories/new/utils/draft-autosave';

describe('createDraftAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('299ms에는 저장하지 않고 300ms 경계에서 마지막 값을 저장한다', () => {
    const persisted: (string | null)[] = [];
    const statuses: DraftSaveStatus[] = [];
    const autosave = createDraftAutosave<string>({
      persist: (value) => {
        persisted.push(value);

        return true;
      },
      onStatusChange: (status) => statuses.push(status),
    });

    autosave.schedule('판타지');

    expect(statuses.at(-1)).toBe('saving');
    vi.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS - 1);
    expect(persisted).toEqual([]);
    expect(statuses.at(-1)).toBe('saving');

    vi.advanceTimersByTime(1);
    expect(persisted).toEqual(['판타지']);
    expect(statuses.at(-1)).toBe('saved');
  });

  it('300ms 안에 다시 편집하면 앞선 예약을 취소하고 마지막 변경만 저장한다', () => {
    const persisted: (string | null)[] = [];
    const autosave = createDraftAutosave<string>({
      persist: (value) => {
        persisted.push(value);

        return true;
      },
      onStatusChange: () => undefined,
    });

    autosave.schedule('첫 입력');
    vi.advanceTimersByTime(299);
    autosave.schedule('마지막 입력');
    vi.advanceTimersByTime(299);
    expect(persisted).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(persisted).toEqual(['마지막 입력']);
  });

  it('명시적 이탈 flush는 300ms를 기다리지 않고 현재 값을 저장한다', () => {
    const persisted: (string | null)[] = [];
    const autosave = createDraftAutosave<string>({
      persist: (value) => {
        persisted.push(value);

        return true;
      },
      onStatusChange: () => undefined,
    });

    autosave.schedule('이탈 직전 입력');

    expect(autosave.flush()).toBe(true);
    expect(persisted).toEqual(['이탈 직전 입력']);
    vi.advanceTimersByTime(DRAFT_AUTOSAVE_DELAY_MS);
    expect(persisted).toHaveLength(1);
  });
});
