'use client';

/**
 * 진행 중인 인앱 로그인 핸드오프 상태. 외부 브라우저 전환 직전에 저장하고,
 * 인앱으로 복귀했을 때 상태 조회(GET status)로 이관 결과를 정리하는 데 쓴다.
 */
export type PendingHandoff = {
  /** 일회용 핸드오프 코드. 상태 조회 헤더에 실어야 하므로 자기 기기에 보관한다. */
  code: string;
  /** 분석 전용 식별자(비밀값 아님). 퍼널 이벤트를 잇는 데 쓴다. */
  handoffId: string;
  /** 핸드오프에 담아 보낸 스토리 로컬 ID. 이관 완료 시 이 중 이관분만 차감한다. */
  storyIds: string[];
  /** 핸드오프에 담아 보낸 채팅 로컬 ID. */
  chatIds: string[];
};

/**
 * 진행 중인 로그인 핸드오프 저장 키.
 * 코드는 비밀값이지만 자기 기기 localStorage 보관은 생성 주체(같은 기기)라 허용한다 —
 * 인앱 복귀 시 상태 조회에 코드가 필요하기 때문이다. 로그·분석·외부로는 절대 내보내지 않는다.
 */
export const PENDING_HANDOFF_STORAGE_KEY = 'manyak:pending-login-handoff';

/**
 * 파싱한 값이 PendingHandoff 형태인지 검사한다. 손상·구버전 데이터를 걸러낸다.
 *
 * @param value JSON.parse 결과(임의 타입)
 * @returns PendingHandoff이면 true
 */
function isPendingHandoff(value: unknown): value is PendingHandoff {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.code === 'string' &&
    typeof candidate.handoffId === 'string' &&
    Array.isArray(candidate.storyIds) &&
    candidate.storyIds.every((id) => typeof id === 'string') &&
    Array.isArray(candidate.chatIds) &&
    candidate.chatIds.every((id) => typeof id === 'string')
  );
}

/**
 * 진행 중인 핸드오프를 localStorage에 저장한다(외부 전환 직전).
 *
 * @param pending 저장할 핸드오프 상태
 */
export function savePendingHandoff(pending: PendingHandoff): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    PENDING_HANDOFF_STORAGE_KEY,
    JSON.stringify(pending),
  );
}

/**
 * 저장된 진행 중 핸드오프를 읽는다. 없거나 손상·형태 불일치면 null을 반환한다.
 *
 * @returns 저장된 핸드오프 또는 null
 */
export function readPendingHandoff(): PendingHandoff | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_HANDOFF_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return isPendingHandoff(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 저장된 진행 중 핸드오프를 제거한다(이관 정리 완료·만료 시).
 */
export function clearPendingHandoff(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(PENDING_HANDOFF_STORAGE_KEY);
}
