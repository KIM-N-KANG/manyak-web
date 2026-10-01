'use client';

import { useEffect, useState } from 'react';

import { useLiveQuery } from 'dexie-react-hooks';

import { useCreationEpoch } from '@/features/stories/_shared/hooks/use-creation-epoch';
import { creationDb } from '@/features/stories/_shared/utils/creation-db';
import {
  initializeCreationStorage,
  loadPendingCreationRequests,
  loadStoryCompletionRequests,
  sortByCreatedAtDesc,
} from '@/features/stories/_shared/utils/creation-request-storage';

/** 초안과 완성 목록을 조회하며 로딩, 실패, 빈 목록을 구분한다. */
export function useCreationRecords() {
  const epoch = useCreationEpoch();
  const [attempt, setAttempt] = useState(0);
  const [initialization, setInitialization] = useState<{
    epoch: number;
    attempt: number;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;

    void initializeCreationStorage().then(
      () => {
        if (active) setInitialization({ epoch, attempt, failed: false });
      },
      () => {
        if (active) setInitialization({ epoch, attempt, failed: true });
      },
    );

    return () => {
      active = false;
    };
  }, [epoch, attempt]);

  const ready =
    initialization?.epoch === epoch && initialization.attempt === attempt;
  const result = useLiveQuery(async () => {
    if (!ready) return undefined;

    try {
      if (initialization.failed)
        throw new Error('Creation storage is unavailable');

      const [pending, completions] = await creationDb.transaction(
        'r',
        creationDb.tables,
        () =>
          Promise.all([
            loadPendingCreationRequests(),
            loadStoryCompletionRequests(),
          ]),
      );

      return {
        epoch,
        pending: sortByCreatedAtDesc(pending),
        completions: sortByCreatedAtDesc(completions),
        isError: false,
      };
    } catch {
      return { epoch, pending: [], completions: [], isError: true };
    }
  }, [epoch, attempt, ready, initialization?.failed]);

  const current = ready && result?.epoch === epoch ? result : undefined;

  return {
    ...current,
    isLoading: current === undefined,
    retry: () => setAttempt((value) => value + 1),
  };
}
