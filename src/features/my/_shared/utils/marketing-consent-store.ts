'use client';

import { useSyncExternalStore } from 'react';

/**
 * 광고 알림 동의의 탭 내 신호를 루트 시트에 전달하는 외부 스토어.
 *
 * - `answer`: 필수 동의 시트의 선택 항목에 답한 결과. 루트 시트가 받아 저장·통지한다.
 * - `reaskUserId`: 재진입 판정으로 재질문 시트를 띄울 회원.
 *
 * 새로고침이면 사라져도 되는 값이라 저장소에 두지 않는다.
 */
type MarketingConsentSignal = {
  answer: { userId: string; accepted: boolean } | null;
  reaskUserId: string | null;
};

let signal: MarketingConsentSignal = { answer: null, reaskUserId: null };
const listeners = new Set<() => void>();

/**
 * 신호를 바꾸고 구독자에게 알린다.
 *
 * @param patch 바꿀 값
 */
function set(patch: Partial<MarketingConsentSignal>): void {
  signal = { ...signal, ...patch };
  listeners.forEach((listener) => listener());
}

/**
 * 필수 동의 시트의 선택 항목 답을 넘긴다.
 *
 * @param userId 회원 공개 ID
 * @param accepted 광고 동의 체크 여부
 */
export function submitMarketingConsentAnswer(
  userId: string,
  accepted: boolean,
): void {
  set({ answer: { userId, accepted } });
}

/** 넘긴 답을 소비했음을 표시한다. */
export function clearMarketingConsentAnswer(): void {
  set({ answer: null });
}

/**
 * 회원의 재질문 시트를 대기 상태로 만든다.
 *
 * @param userId 회원 공개 ID
 */
export function requestMarketingConsentReask(userId: string): void {
  set({ reaskUserId: userId });
}

/** 대기 중인 재질문을 지운다. */
export function clearMarketingConsentReask(): void {
  set({ reaskUserId: null });
}

/**
 * 변경 구독을 등록한다.
 *
 * @param listener 변경 시 호출할 콜백
 * @returns 구독 해제 함수
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/**
 * 현재 신호를 읽는다.
 *
 * @returns 현재 신호
 */
function getSnapshot(): MarketingConsentSignal {
  return signal;
}

const SERVER_SNAPSHOT: MarketingConsentSignal = {
  answer: null,
  reaskUserId: null,
};

/**
 * 서버 렌더 스냅샷. 항상 신호 없음이다.
 *
 * @returns 빈 신호
 */
function getServerSnapshot(): MarketingConsentSignal {
  return SERVER_SNAPSHOT;
}

/**
 * 광고 동의 신호를 구독한다.
 *
 * @returns 현재 신호
 */
export function useMarketingConsentSignal(): MarketingConsentSignal {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
