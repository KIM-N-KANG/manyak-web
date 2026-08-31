'use client';

import { useEffect, useRef, useState } from 'react';

import {
  createDraftAutosave,
  type DraftAutosaveController,
  type DraftSaveStatus,
} from '../utils/draft-autosave';

type UseStoryDraftAutosaveArgs<Value> = {
  candidate: Value | null;
  fingerprint: string;
  enabled: boolean;
  persist: (value: Value | null) => boolean;
};

/**
 * 퍼널 편집값을 300ms 디바운스로 저장하고 페이지 비활성화 직전에 즉시 반영한다.
 *
 * @param args 현재 저장 후보·변경 지문·활성 여부·저장 함수
 * @returns 저장 상태와 즉시 저장·상태 확정 핸들러
 */
export function useStoryDraftAutosave<Value>({
  candidate,
  fingerprint,
  enabled,
  persist,
}: UseStoryDraftAutosaveArgs<Value>) {
  const [status, setStatus] = useState<DraftSaveStatus>('hidden');
  const candidateRef = useRef(candidate);
  const persistRef = useRef(persist);
  const skipNextScheduleRef = useRef(false);
  const controllerRef = useRef<DraftAutosaveController<Value> | null>(null);

  useEffect(() => {
    controllerRef.current = createDraftAutosave<Value>({
      persist: (value) => persistRef.current(value),
      onStatusChange: setStatus,
    });

    return () => {
      controllerRef.current?.cancel();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    candidateRef.current = candidate;
    persistRef.current = persist;
  });

  useEffect(() => {
    const controller = controllerRef.current;

    if (controller === null) {
      return;
    }

    if (!enabled) {
      controller.cancel();

      return;
    }

    if (skipNextScheduleRef.current) {
      skipNextScheduleRef.current = false;
      controller.cancel();
      controller.markSaved();

      return;
    }

    controller.schedule(candidateRef.current);

    return () => controller.cancel();
  }, [enabled, fingerprint]);

  useEffect(() => {
    const flushPending = () => controllerRef.current?.flush();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPending();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', flushPending);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', flushPending);
    };
  }, []);

  const flushCurrent = () => {
    const controller = controllerRef.current;

    if (controller === null || !enabled) {
      return false;
    }

    controller.schedule(candidateRef.current);

    return controller.flush();
  };

  const markCurrentAsSaved = (saved: boolean) => {
    controllerRef.current?.cancel();
    skipNextScheduleRef.current = saved;
    setStatus(saved ? 'saved' : 'hidden');
  };

  const setPersistedStatus = (saved: boolean) => {
    controllerRef.current?.cancel();
    setStatus(saved ? 'saved' : 'hidden');
  };

  const cancel = () => controllerRef.current?.cancel();

  return {
    status,
    flushCurrent,
    markCurrentAsSaved,
    setPersistedStatus,
    cancel,
  };
}
