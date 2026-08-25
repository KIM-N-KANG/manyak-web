/**
 * 임시 저장본을 "이어서 만들기"로 재개하려는 의도를 보관하는 세션스토리지 키.
 * 제작 탭 배너가 이동 직전에 남기고, 퍼널이 진입 시 읽어 재개 다이얼로그를 건너뛴다.
 */
const DRAFT_RESUME_INTENT_STORAGE_KEY = 'manyak:story-draft-resume-intent';

/**
 * 재개 의도를 남긴다. 이동 URL 대신 스토리지를 쓰는 이유는 클라이언트 전환에서
 * 히스토리 URL 반영과 화면 렌더 순서가 보장되지 않기 때문이다(쿼리 파라미터를
 * 마운트 시점에 읽으면 재진입 경로에서 놓칠 수 있다).
 *
 * @param requestId 재개할 임시 저장본의 요청 ID
 */
export function markDraftResumeIntent(requestId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem(DRAFT_RESUME_INTENT_STORAGE_KEY, requestId);
}

/**
 * 남아 있는 재개 의도를 제거하지 않고 읽는다(렌더 중 판정용).
 *
 * @returns 저장된 요청 ID. 없으면 null
 */
export function peekDraftResumeIntent(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return sessionStorage.getItem(DRAFT_RESUME_INTENT_STORAGE_KEY);
}

/** 재개 의도를 제거한다(소비했거나 더 이상 유효하지 않은 경우). */
export function clearDraftResumeIntent(): void {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(DRAFT_RESUME_INTENT_STORAGE_KEY);
}
