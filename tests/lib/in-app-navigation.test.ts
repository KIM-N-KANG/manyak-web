import { describe, expect, it } from 'vitest';

import {
  hasPreviousHistoryEntry,
  hasPreviousInAppEntry,
} from '@/lib/in-app-navigation';

const sameDocument =
  (flags: boolean[]) =>
  (index: number): boolean | undefined =>
    flags[index];

describe('hasPreviousInAppEntry', () => {
  it('Navigation API에서 바로 아래 기록이 같은 문서면 앱 안 이동으로 본다', () => {
    expect(
      hasPreviousInAppEntry({
        currentIndex: 1,
        isSameDocumentAt: sameDocument([true, true]),
        layerEntryCount: 0,
        historyLength: 2,
        landingHistoryLength: 1,
      }),
    ).toBe(true);
  });

  it('첫 기록이거나 아래 기록이 다른 문서면 바로 진입으로 본다', () => {
    expect(
      hasPreviousInAppEntry({
        currentIndex: 0,
        isSameDocumentAt: sameDocument([true]),
        layerEntryCount: 0,
        historyLength: 5,
        landingHistoryLength: 5,
      }),
    ).toBe(false);
    expect(
      hasPreviousInAppEntry({
        currentIndex: 1,
        isSameDocumentAt: sameDocument([false, true]),
        layerEntryCount: 0,
        historyLength: 2,
        landingHistoryLength: 2,
      }),
    ).toBe(false);
  });

  it('오버레이 더미 칸은 현재 화면으로 치고 그 아래를 본다', () => {
    // [바로 진입한 방, 더미] → 더미를 빼면 첫 기록이라 바로 진입
    expect(
      hasPreviousInAppEntry({
        currentIndex: 1,
        isSameDocumentAt: sameDocument([true, true]),
        layerEntryCount: 1,
        historyLength: 2,
        landingHistoryLength: 1,
      }),
    ).toBe(false);
    // [홈, 상세, 더미] → 더미를 빼도 아래에 홈이 있다
    expect(
      hasPreviousInAppEntry({
        currentIndex: 2,
        isSameDocumentAt: sameDocument([true, true, true]),
        layerEntryCount: 1,
        historyLength: 3,
        landingHistoryLength: 1,
      }),
    ).toBe(true);
  });

  it('Navigation API가 없으면 문서를 연 뒤 늘어난 길이로만 판정한다', () => {
    const base = { currentIndex: null, isSameDocumentAt: () => undefined };

    expect(
      hasPreviousInAppEntry({
        ...base,
        layerEntryCount: 0,
        historyLength: 4,
        landingHistoryLength: 3,
      }),
    ).toBe(true);
    // 교체 이동은 길이를 늘리지 않는다.
    expect(
      hasPreviousInAppEntry({
        ...base,
        layerEntryCount: 0,
        historyLength: 3,
        landingHistoryLength: 3,
      }),
    ).toBe(false);
    // 더미 한 칸만 늘어난 것은 이동이 아니다.
    expect(
      hasPreviousInAppEntry({
        ...base,
        layerEntryCount: 1,
        historyLength: 4,
        landingHistoryLength: 3,
      }),
    ).toBe(false);
    expect(
      hasPreviousInAppEntry({
        ...base,
        layerEntryCount: 0,
        historyLength: 4,
        landingHistoryLength: null,
      }),
    ).toBe(false);
  });
});

describe('hasPreviousHistoryEntry', () => {
  it('다른 문서여도 아래 기록이 있으면 true, 더미만 있으면 false다', () => {
    expect(
      hasPreviousHistoryEntry({
        currentIndex: 1,
        layerEntryCount: 0,
        historyLength: 2,
      }),
    ).toBe(true);
    expect(
      hasPreviousHistoryEntry({
        currentIndex: 0,
        layerEntryCount: 0,
        historyLength: 1,
      }),
    ).toBe(false);
    expect(
      hasPreviousHistoryEntry({
        currentIndex: 1,
        layerEntryCount: 1,
        historyLength: 2,
      }),
    ).toBe(false);
  });

  it('Navigation API가 없으면 히스토리 길이로 본다', () => {
    expect(
      hasPreviousHistoryEntry({
        currentIndex: null,
        layerEntryCount: 0,
        historyLength: 2,
      }),
    ).toBe(true);
    expect(
      hasPreviousHistoryEntry({
        currentIndex: null,
        layerEntryCount: 0,
        historyLength: 1,
      }),
    ).toBe(false);
  });
});
