'use client';

import { useSyncExternalStore } from 'react';

/**
 * 제작 요청 직후 열 알림 프롬프트의 대기 상태를 탭 안에서 전달하는 외부 스토어.
 * 제작 퍼널은 제출 직후 제작 탭으로 이동하며 언마운트되므로, 루트에 마운트된 시트가
 * 이 값을 읽어 이동 뒤에 연다. 새로고침이면 사라져도 되는 값이라 저장소에 두지 않는다.
 */
let pendingUserId: string | null = null;
const listeners = new Set<() => void>();

/** 구독자 전부에게 변경을 알린다. */
function emit(): void {
  listeners.forEach((listener) => listener());
}

/**
 * 회원의 알림 프롬프트를 대기 상태로 만든다.
 *
 * @param userId 프롬프트를 볼 회원 공개 ID
 */
export function requestPushPrompt(userId: string): void {
  pendingUserId = userId;
  emit();
}

/** 대기 중인 알림 프롬프트를 지운다. */
export function clearPushPromptRequest(): void {
  pendingUserId = null;
  emit();
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
 * 현재 대기 중인 회원 ID를 읽는다.
 *
 * @returns 대기 중인 회원 공개 ID 또는 null
 */
function getSnapshot(): string | null {
  return pendingUserId;
}

/**
 * 서버 렌더에서 쓰는 스냅샷. 항상 대기 없음이다.
 *
 * @returns null
 */
function getServerSnapshot(): null {
  return null;
}

/**
 * 대기 중인 알림 프롬프트의 회원 ID를 구독한다.
 *
 * @returns 대기 중인 회원 공개 ID 또는 null
 */
export function usePendingPushPromptUserId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
