'use client';

/**
 * 회원별 알림 프롬프트 질문 단계를 보관하는 localStorage 키 접두사. 값은
 * `{ stage, submitsSinceDecline }` JSON이며 키 뒤에 회원 공개 ID를 붙인다.
 *
 * Android 규칙(첫 거절 뒤 세 번째 재진입에서 한 번 더, 그 뒤 닫힘)을 웹의 진입점인
 * 제작 요청 횟수로 옮겼다. 회원 귀속이라 다른 계정에는 영향이 없다.
 */
export const PUSH_PROMPT_STORAGE_KEY_PREFIX = 'manyak:push-prompt:';

/** 첫 거절 뒤 다시 묻기까지 필요한 제작 요청 횟수. */
export const PUSH_PROMPT_REASK_AFTER_SUBMITS = 3;

export type PushPromptRecord = {
  /** `declined-once`는 한 번 거절, `closed`는 허용했거나 두 번 거절해 더 묻지 않음. */
  stage: 'declined-once' | 'closed';
  /** 첫 거절 뒤 누적된 제작 요청 횟수. */
  submitsSinceDecline: number;
};

/**
 * localStorage를 안전하게 얻는다. SSR·저장소 접근 차단 환경에서는 null이다.
 *
 * @returns 사용할 수 있는 localStorage 또는 null
 */
function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * 회원의 프롬프트 기록을 읽는다.
 *
 * @param userId 회원 공개 ID
 * @returns 기록 또는 아직 묻지 않았으면 null
 */
export function readPushPromptRecord(userId: string): PushPromptRecord | null {
  const raw = getLocalStorage()?.getItem(
    `${PUSH_PROMPT_STORAGE_KEY_PREFIX}${userId}`,
  );

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'stage' in parsed &&
      (parsed.stage === 'declined-once' || parsed.stage === 'closed')
    ) {
      const submits =
        'submitsSinceDecline' in parsed &&
        typeof parsed.submitsSinceDecline === 'number'
          ? parsed.submitsSinceDecline
          : 0;

      return { stage: parsed.stage, submitsSinceDecline: submits };
    }
  } catch {
    // 깨진 값은 묻지 않은 것으로 본다.
  }

  return null;
}

/**
 * 회원의 프롬프트 기록을 쓴다.
 *
 * @param userId 회원 공개 ID
 * @param record 저장할 기록
 */
export function writePushPromptRecord(
  userId: string,
  record: PushPromptRecord,
): void {
  getLocalStorage()?.setItem(
    `${PUSH_PROMPT_STORAGE_KEY_PREFIX}${userId}`,
    JSON.stringify(record),
  );
}

/**
 * 제작 요청 한 번을 기록에 반영한 뒤 이번에 물어도 되는지 판정한다. 순수 함수라
 * 저장은 호출부가 한다.
 *
 * @param record 현재 기록. 없으면 아직 묻지 않은 상태
 * @returns 갱신된 기록(없으면 null)과 이번 요청에서 물을지 여부
 */
export function advancePushPromptRecord(record: PushPromptRecord | null): {
  record: PushPromptRecord | null;
  shouldPrompt: boolean;
} {
  if (record === null) {
    return { record: null, shouldPrompt: true };
  }

  if (record.stage === 'closed') {
    return { record, shouldPrompt: false };
  }

  const submitsSinceDecline = record.submitsSinceDecline + 1;

  return {
    record: { stage: 'declined-once', submitsSinceDecline },
    shouldPrompt: submitsSinceDecline >= PUSH_PROMPT_REASK_AFTER_SUBMITS,
  };
}

/**
 * 프롬프트에 답한 결과를 다음 기록으로 바꾼다. 허용은 닫힘, 거절은 첫 거절이면
 * 재질문 대기, 두 번째면 닫힘이다.
 *
 * @param record 답하기 전 기록
 * @param accepted 허용 여부
 * @returns 저장할 기록
 */
export function answerPushPromptRecord(
  record: PushPromptRecord | null,
  accepted: boolean,
): PushPromptRecord {
  if (accepted || record?.stage === 'declined-once') {
    return { stage: 'closed', submitsSinceDecline: 0 };
  }

  return { stage: 'declined-once', submitsSinceDecline: 0 };
}
