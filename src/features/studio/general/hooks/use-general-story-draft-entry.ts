'use client';

import { useEffect, useState } from 'react';

import {
  findPendingCreationRequest,
  type GeneralDraftRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  clearDraftResumeIntent,
  peekDraftResumeIntent,
} from '@/features/stories/_shared/utils/draft-resume-intent';

/**
 * 일반 제작 진입 때 재개 의도(제작 탭 카드의 "이어서 만들기")가 가리키는 임시 저장본을 불러오는 훅.
 * 의도가 없거나 일반 제작 저장본이 아니면 새로 만든다.
 *
 * @returns 진입 판정 결과(`entry`가 없으면 조회 중), 조회 실패 여부와 재시도 함수
 */
export function useGeneralStoryDraftEntry() {
  const [entry, setEntry] = useState<{
    record: GeneralDraftRecord | null;
  } | null>(null);
  const [isError, setIsError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const requestId = peekDraftResumeIntent();
        const record =
          requestId === null
            ? null
            : await findPendingCreationRequest(requestId);

        if (!active) return;

        clearDraftResumeIntent();
        setIsError(false);
        setEntry({ record: record?.stage === 'GENERAL_DRAFT' ? record : null });
      } catch {
        if (active) setIsError(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    entry,
    isError,
    retry: () => setAttempt((value) => value + 1),
  };
}
