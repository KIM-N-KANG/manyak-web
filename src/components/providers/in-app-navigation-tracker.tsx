'use client';

import { useEffect } from 'react';

import { getLayerEntryCount } from '@/lib/history-layers';
import { hasPreviousInAppEntry } from '@/lib/in-app-navigation';

/** TypeScript DOM 타입에 아직 없는 Navigation API 중 아래 기록을 읽는 데 쓰는 부분이다. */
type NavigationHistory = {
  currentEntry: { index: number } | null;
  entries: () => { sameDocument: boolean }[];
};

/** 이 문서를 처음 열었을 때의 `history.length`. Navigation API가 없는 브라우저의 판정 기준이다. */
let landingHistoryLength: number | null = null;

/**
 * 헤더 뒤로가기로 돌아갈 앱 안 화면이 아래에 있는지 돌려준다.
 * false면 현재 화면이 탭의 첫 진입(공유·외부 링크·알림)이거나 그 화면을 교체한 것이라 돌아갈 앱 화면이 없다.
 * 판정 규칙은 [hasPreviousInAppEntry](../../lib/in-app-navigation.ts)를 따르며, 오버레이가 쌓은 더미 칸은
 * 현재 화면으로 친다. `history.length` 절댓값은 인앱·자동화 브라우저가 빈 첫 기록을 남겨 부풀므로 쓰지 않는다.
 *
 * @returns 아래에 앱 안 화면이 있으면 true
 */
export function hasInAppNavigation(): boolean {
  const navigation = (window as Window & { navigation?: NavigationHistory })
    .navigation;
  const entries = navigation?.entries() ?? [];

  return hasPreviousInAppEntry({
    currentIndex: navigation?.currentEntry?.index ?? null,
    isSameDocumentAt: (index) => entries[index]?.sameDocument,
    layerEntryCount: getLayerEntryCount(),
    historyLength: window.history.length,
    landingHistoryLength,
  });
}

export function InAppNavigationTracker() {
  useEffect(() => {
    if (landingHistoryLength === null) {
      landingHistoryLength = window.history.length;
    }
  }, []);

  return null;
}
