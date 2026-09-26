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

  it('299ms에는 저장하지 않고 300ms 경계에서 마지막 값을 저장한다', async () => {
    const persisted: (string | null)[] = [];
    const statuses: DraftSaveStatus[] = [];
    const autosave = createDraftAutosave<string>({
      persist: async (value) => {
        persisted.push(value);

        return true;
      },
      onStatusChange: (status) => statuses.push(status),
    });

    autosave.schedule('판타지');

    expect(statuses.at(-1)).toBe('saving');
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_DELAY_MS - 1);
    expect(persisted).toEqual([]);
    expect(statuses.at(-1)).toBe('saving');

    await vi.advanceTimersByTimeAsync(1);
    expect(persisted).toEqual(['판타지']);
    expect(statuses.at(-1)).toBe('saved');
  });

  it('300ms 안에 다시 편집하면 앞선 예약을 취소하고 마지막 변경만 저장한다', async () => {
    const persisted: (string | null)[] = [];
    const autosave = createDraftAutosave<string>({
      persist: async (value) => {
        persisted.push(value);

        return true;
      },
      onStatusChange: () => undefined,
    });

    autosave.schedule('첫 입력');
    await vi.advanceTimersByTimeAsync(299);
    autosave.schedule('마지막 입력');
    await vi.advanceTimersByTimeAsync(299);
    expect(persisted).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(persisted).toEqual(['마지막 입력']);
  });

  it('명시적 이탈 flush는 300ms를 기다리지 않고 현재 값을 저장한다', async () => {
    const persisted: (string | null)[] = [];
    const autosave = createDraftAutosave<string>({
      persist: async (value) => {
        persisted.push(value);

        return true;
      },
      onStatusChange: () => undefined,
    });

    autosave.schedule('이탈 직전 입력');

    expect(await autosave.flush()).toBe(true);
    expect(persisted).toEqual(['이탈 직전 입력']);
    await vi.advanceTimersByTimeAsync(DRAFT_AUTOSAVE_DELAY_MS);
    expect(persisted).toHaveLength(1);
  });
});

describe('비동기 저장 순서', () => {
  it('이전 쓰기가 완료돼도 새 입력이 남으면 저장됨을 표시하지 않는다', async () => {
    let finishFirst!: (saved: boolean) => void;
    let finishSecond!: (saved: boolean) => void;
    const statuses: DraftSaveStatus[] = [];
    const persist = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            finishSecond = resolve;
          }),
      );
    const autosave = createDraftAutosave<string>({
      persist,
      onStatusChange: (status) => statuses.push(status),
    });

    autosave.schedule('첫 입력');

    const flushing = autosave.flush();

    autosave.schedule('중간 입력');
    autosave.schedule('최신 입력');
    finishFirst(true);
    await Promise.resolve();
    expect(statuses.at(-1)).toBe('saving');
    expect(persist.mock.calls.map((call) => call[0])).toEqual([
      '첫 입력',
      '최신 입력',
    ]);
    finishSecond(true);
    expect(await flushing).toBe(true);
    expect(statuses.at(-1)).toBe('saved');
    autosave.cancel();
  });

  it('저장 실패는 flush 실패로 전달하고 성공 배지를 표시하지 않는다', async () => {
    const onStatusChange = vi.fn();
    const autosave = createDraftAutosave<string>({
      persist: async () => {
        throw new Error('quota');
      },
      onStatusChange,
    });

    autosave.schedule('보존할 입력');
    expect(await autosave.flush()).toBe(false);
    expect(onStatusChange).not.toHaveBeenCalledWith('saved');
  });

  it('단계 전환은 이미 시작한 쓰기의 종료를 기다리고 예약값을 취소한다', async () => {
    let complete!: (saved: boolean) => void;
    const persist = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          complete = resolve;
        }),
    );
    const onStatusChange = vi.fn();
    const autosave = createDraftAutosave<string>({ persist, onStatusChange });

    autosave.schedule('진행 중');

    const flushing = autosave.flush();

    autosave.schedule('취소할 예약');

    const settled = vi.fn();
    const settlement = autosave.settle().then(settled);

    expect(settled).not.toHaveBeenCalled();
    complete(true);
    await flushing;
    await settlement;
    expect(persist).toHaveBeenCalledTimes(1);
    expect(onStatusChange).not.toHaveBeenCalledWith('saved');
  });
});
