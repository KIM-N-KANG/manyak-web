import { type RefObject, useLayoutEffect } from 'react';

/** 화면 키별로 떠날 때의 스크롤 위치. 문서 단위라 새로고침하면 비워진다. */
const positions = new Map<string, number>();

/** 내용이 자라기를 기다리는 상한. 넘기면 지금 높이에서 맞출 수 있는 만큼만 복원한다. */
const RESTORE_TIMEOUT_MS = 2000;

type ScrollRestorationOptions = {
  /**
   * 참이면 기록 칸마다 따로 기억한다. 같은 화면을 새로 열면 맨 위에서 시작하고, 뒤로가기로 같은 칸에 돌아올
   * 때만 떠날 때의 위치를 되찾는다. Navigation API가 없으면 칸을 가를 수 없어 복원하지 않는다.
   */
  perHistoryEntry?: boolean;
};

/**
 * 위치를 저장할 키를 만든다. 칸별 저장이면 화면 키에 지금 기록 칸의 키를 붙인다.
 *
 * @param key 화면 키(경로와 쿼리)
 * @param perHistoryEntry 기록 칸마다 따로 기억할지
 * @returns 저장 키. 칸별 저장인데 Navigation API가 없으면 null
 */
function storageKey(key: string, perHistoryEntry: boolean): string | null {
  if (!perHistoryEntry) return key;

  const entryKey = (
    window as Window & {
      navigation?: { currentEntry?: { key: string } | null };
    }
  ).navigation?.currentEntry?.key;

  return entryKey ? `${key}#${entryKey}` : null;
}

/**
 * 스크롤 위치를 화면 키로 기억한다. 스크롤 이벤트마다 부른다.
 *
 * @param key 화면 키(경로와 쿼리)
 * @param top 스크롤러의 scrollTop
 * @param options 기록 칸마다 따로 기억할지
 */
export function rememberScrollPosition(
  key: string,
  top: number,
  { perHistoryEntry = false }: ScrollRestorationOptions = {},
): void {
  const storeKey = storageKey(key, perHistoryEntry);

  if (storeKey !== null) positions.set(storeKey, top);
}

/**
 * 화면 키가 바뀌면 그 키로 기억한 스크롤 위치를 스크롤러에 되돌리는 훅.
 *
 * 탭 전환과 상세·채팅방에서의 복귀는 내부 스크롤러를 다시 그리거나 Next가 새 세그먼트를 맨 위로 끌어올려
 * 위치가 사라지므로, 떠날 때 기억한 값을 돌려놓는다. 목록 데이터가 아직 짧아 닿지 못하면 내용이 자라는 동안
 * 다시 시도한다.
 *
 * @param scroller 스크롤러 요소나 그 ref. 요소가 늦게 붙는 화면은 요소를 넘겨 붙을 때 다시 복원한다
 * @param key 화면 키(경로와 쿼리)
 * @param options 기록 칸마다 따로 기억할지
 */
export function useScrollRestoration(
  scroller: RefObject<HTMLElement | null> | HTMLElement | null,
  key: string,
  { perHistoryEntry = false }: ScrollRestorationOptions = {},
): void {
  useLayoutEffect(() => {
    const element =
      scroller && 'current' in scroller ? scroller.current : scroller;
    const storeKey = storageKey(key, perHistoryEntry);

    if (!element || storeKey === null) return;

    const target = positions.get(storeKey) ?? 0;

    const apply = () => {
      element.scrollTo({ top: target });

      return Math.abs(element.scrollTop - target) < 1;
    };

    if (apply()) return;

    const observer = new ResizeObserver(() => {
      if (apply()) {
        observer.disconnect();
        window.clearTimeout(timer);
      }
    });

    for (const child of element.children) observer.observe(child);

    const timer = window.setTimeout(
      () => observer.disconnect(),
      RESTORE_TIMEOUT_MS,
    );

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [scroller, key, perHistoryEntry]);
}
