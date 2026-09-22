'use client';

import { useEffect, useRef, useState } from 'react';

import type {
  DraftCreationRecord,
  PendingCreationRequest,
  StorylineGenerationRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { findPendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  clearDraftResumeIntent,
  peekDraftResumeIntent,
} from '@/features/stories/_shared/utils/draft-resume-intent';

type UseStoryCreateDraftArgs = {
  /** draft 레코드로 퍼널 상태를 복원한다. */
  onRestore: (record: DraftCreationRecord) => void;
  /** 진행 중이던 스토리라인 생성 레코드로 로딩 화면을 복원한다. 복구 조회는 복구 훅이 잇는다. */
  onRestorePending: (record: StorylineGenerationRecord) => void;
};

/**
 * 편집 자동 저장 레코드인지 판별한다.
 *
 * @param record 판별할 편집 초안 레코드
 * @returns 키워드 또는 스토리 편집 draft이면 true
 */
function isDraftCreationRecord(
  record: PendingCreationRequest | null,
): record is DraftCreationRecord {
  return record?.stage === 'KEYWORD_DRAFT' || record?.stage === 'STORY_DRAFT';
}

/**
 * 퍼널 진입 시 재개 의도(세션스토리지 requestId)를 읽어 그 레코드만 복원하는 훅.
 *
 * - 진행 카드 "이어서 만들기" 경유 진입이면 해당 레코드를 즉시 복원한다.
 * - 그 외 진입은 항상 새 세션이다. 다른 초안은 건드리지 않는다.
 * - 복원한 레코드는 유지하고 이후 편집 자동 저장으로 갱신한다.
 *
 * @param args 레코드 복원 콜백
 * @returns 진입 판정 완료 여부
 */
export function useStoryCreateDraft({
  onRestore,
  onRestorePending,
}: UseStoryCreateDraftArgs) {
  // 마운트 시 한 번만 판정한다. 진입 이후의 목록 변화(새 생성 시작 등)는 재개
  // 대상이 아니므로 스토리지 구독 대신 일회성 판정을 쓴다.
  const [entryRecord] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const requestId = peekDraftResumeIntent();

    return requestId === null ? null : findPendingCreationRequest(requestId);
  });
  const [isEntryResolved, setIsEntryResolved] = useState(entryRecord === null);
  const callbacksRef = useRef({ onRestore, onRestorePending });

  useEffect(() => {
    callbacksRef.current = { onRestore, onRestorePending };
  });

  // 복원은 부모 상태를 갱신하므로 렌더 중이 아닌 커밋 이후에 수행한다. 의도 플래그는
  // 어떤 경로로 들어왔든 한 번 쓰고 지워 다음 진입에 새지 않게 한다.
  useEffect(() => {
    clearDraftResumeIntent();

    if (entryRecord === null) {
      return;
    }

    const current = findPendingCreationRequest(entryRecord.requestId);

    if (isDraftCreationRecord(current)) {
      callbacksRef.current.onRestore(current);
    } else if (current?.stage === 'STORYLINE_GENERATION') {
      callbacksRef.current.onRestorePending(current);
    }

    queueMicrotask(() => setIsEntryResolved(true));
  }, [entryRecord]);

  return { isEntryResolved };
}
