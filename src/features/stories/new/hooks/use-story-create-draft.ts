'use client';

import { useEffect, useRef, useState } from 'react';

import type { DraftCreationRecord } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  clearPendingCreationRequest,
  loadPendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  clearDraftResumeIntent,
  peekDraftResumeIntent,
} from '@/features/stories/_shared/utils/draft-resume-intent';
import { track } from '@/observability/analytics';

type UseStoryCreateDraftArgs = {
  /** draft 레코드로 퍼널 상태를 복원한다. */
  onRestore: (record: DraftCreationRecord) => void;
};

/**
 * 편집 자동 저장 레코드인지 판별한다.
 *
 * @param record 판별할 복구 슬롯 레코드
 * @returns 키워드 또는 스토리 편집 draft이면 true
 */
function isDraftCreationRecord(
  record: ReturnType<typeof loadPendingCreationRequest>,
): record is DraftCreationRecord {
  return record?.stage === 'KEYWORD_DRAFT' || record?.stage === 'STORY_DRAFT';
}

/**
 * 퍼널 진입 시 임시 저장(draft) 레코드를 감지해 재개 흐름을 결정하는 훅.
 *
 * - 배너 경유(세션스토리지 재개 의도) 진입이면 즉시 복원한다.
 * - 그 외 진입이면 이어서/새로 만들기 다이얼로그를 띄운다.
 * - 복원한 레코드는 유지하고 이후 편집 자동 저장으로 갱신한다.
 * - in-flight 레코드는 복구 훅(useCreationRequestRecovery) 소관이라 여기서 건드리지 않는다.
 *
 * @param args draft 복원 콜백
 * @returns 재개 다이얼로그 상태와 계속·새로 만들기·닫기 핸들러
 */
export function useStoryCreateDraft({ onRestore }: UseStoryCreateDraftArgs) {
  // 마운트 시 한 번만 판정한다. 진입 이후의 슬롯 변화(새 생성 시작 등)는 재개
  // 대상이 아니므로 스토리지 구독 대신 일회성 판정을 쓴다.
  const [entryDraft] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const record = loadPendingCreationRequest();

    if (!isDraftCreationRecord(record)) {
      return null;
    }

    return {
      record,
      isResumeEntry: peekDraftResumeIntent() === record.requestId,
    };
  });
  const [resumeDialogRecord, setResumeDialogRecord] =
    useState<DraftCreationRecord | null>(
      entryDraft !== null && !entryDraft.isResumeEntry
        ? entryDraft.record
        : null,
    );
  const [isEntryResolved, setIsEntryResolved] = useState(entryDraft === null);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  });

  // 배너 경유(재개 의도) 진입은 묻지 않고 즉시 복원한다. 복원은 부모 상태를
  // 갱신하므로 렌더 중이 아닌 커밋 이후에 수행한다. 의도 플래그는 어떤 경로로
  // 들어왔든 한 번 쓰고 지워 다음 진입에 새지 않게 한다.
  useEffect(() => {
    clearDraftResumeIntent();

    if (entryDraft === null || !entryDraft.isResumeEntry) {
      return;
    }

    const current = loadPendingCreationRequest();

    if (
      isDraftCreationRecord(current) &&
      current.requestId === entryDraft.record.requestId
    ) {
      onRestoreRef.current(current);
    }

    queueMicrotask(() => setIsEntryResolved(true));
  }, [entryDraft]);

  useEffect(() => {
    if (entryDraft !== null && !entryDraft.isResumeEntry) {
      track('client_storyCreate_resumeDialog_shown');
    }
  }, [entryDraft]);

  const handleResumeContinue = () => {
    const record = resumeDialogRecord;

    setResumeDialogRecord(null);

    const current = loadPendingCreationRequest();

    if (
      record !== null &&
      isDraftCreationRecord(current) &&
      current.requestId === record.requestId
    ) {
      track('client_storyCreate_resumeDialog_continued');
      onRestoreRef.current(current);
    }

    setIsEntryResolved(true);
  };

  const handleResumeDiscard = () => {
    track('client_storyCreate_resumeDialog_discarded');
    setResumeDialogRecord(null);
    clearPendingCreationRequest();
    setIsEntryResolved(true);
  };

  // 재개 레코드를 빈 편집 화면이 덮지 않도록 이어서/새로 만들기 중 하나를 반드시 고른다.
  const closeResumeDialog = () => undefined;

  return {
    isEntryResolved,
    isResumeDialogOpen: resumeDialogRecord !== null,
    handleResumeContinue,
    handleResumeDiscard,
    closeResumeDialog,
  };
}
