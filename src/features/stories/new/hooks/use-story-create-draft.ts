'use client';

import { useEffect, useRef, useState } from 'react';

import type { StoryDraftRecord } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  clearPendingCreationRequest,
  loadPendingCreationRequest,
  takePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { track } from '@/observability/analytics';

type UseStoryCreateDraftArgs = {
  /** draft 레코드로 퍼널 상태를 복원한다. */
  onRestore: (record: StoryDraftRecord) => void;
};

/**
 * 퍼널 진입 시 임시 저장(draft) 레코드를 감지해 재개 흐름을 결정하는 훅.
 *
 * - 배너 경유(`?resume=1`) 진입이면 즉시 복원한다.
 * - 그 외 진입이면 이어서/새로 만들기 다이얼로그를 띄운다.
 * - 복원은 레코드를 소비(제거)하므로 이후 이탈 시 그 시점 상태로 새 draft가
 *   저장된다. in-flight 레코드는 복구 훅(useCreationRequestRecovery) 소관이라
 *   여기서 건드리지 않는다.
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

    if (record?.stage !== 'STORY_DRAFT') {
      return null;
    }

    return {
      record,
      isResumeEntry:
        new URLSearchParams(window.location.search).get('resume') === '1',
    };
  });
  const [resumeDialogRecord, setResumeDialogRecord] =
    useState<StoryDraftRecord | null>(
      entryDraft !== null && !entryDraft.isResumeEntry
        ? entryDraft.record
        : null,
    );
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  });

  // 배너 경유(?resume=1) 진입은 묻지 않고 즉시 복원한다. 복원은 부모 상태를
  // 갱신하므로 렌더 중이 아닌 커밋 이후에 수행한다.
  useEffect(() => {
    if (entryDraft === null || !entryDraft.isResumeEntry) {
      return;
    }

    if (takePendingCreationRequest(entryDraft.record.requestId)) {
      onRestoreRef.current(entryDraft.record);
    }
  }, [entryDraft]);

  useEffect(() => {
    if (entryDraft !== null && !entryDraft.isResumeEntry) {
      track('client_storyCreate_resumeDialog_shown');
    }
  }, [entryDraft]);

  const handleResumeContinue = () => {
    const record = resumeDialogRecord;

    setResumeDialogRecord(null);

    if (record !== null && takePendingCreationRequest(record.requestId)) {
      track('client_storyCreate_resumeDialog_continued');
      onRestoreRef.current(record);
    }
  };

  const handleResumeDiscard = () => {
    track('client_storyCreate_resumeDialog_discarded');
    setResumeDialogRecord(null);
    clearPendingCreationRequest();
  };

  // ESC 등으로 닫으면 draft를 남겨 둔다(홈 배너로 여전히 재개 가능).
  const closeResumeDialog = () => {
    setResumeDialogRecord(null);
  };

  return {
    isResumeDialogOpen: resumeDialogRecord !== null,
    handleResumeContinue,
    handleResumeDiscard,
    closeResumeDialog,
  };
}
