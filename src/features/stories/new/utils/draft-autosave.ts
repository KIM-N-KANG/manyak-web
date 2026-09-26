/** 편집 임시 저장 디바운스 시간(ms) */
export const DRAFT_AUTOSAVE_DELAY_MS = 300;
export type DraftSaveStatus = 'hidden' | 'saving' | 'saved';

type DraftAutosaveOptions<Value> = {
  persist: (value: Value | null) => Promise<boolean>;
  onStatusChange: (status: DraftSaveStatus) => void;
};

export type DraftAutosaveController<Value> = {
  schedule: (value: Value | null) => void;
  flush: () => Promise<boolean>;
  cancel: () => void;
  settle: () => Promise<void>;
  markSaved: () => void;
};

/** 최신 편집값만 저장하고 실제 커밋 순서와 표시 상태를 맞춘다. */
export function createDraftAutosave<Value>({
  persist,
  onStatusChange,
}: DraftAutosaveOptions<Value>): DraftAutosaveController<Value> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { value: Value | null; revision: number } | undefined;
  let revision = 0;
  let running: Promise<boolean> | null = null;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);

    timer = null;
  };
  const cancel = () => {
    clearTimer();
    pending = undefined;
    revision++;
  };
  const flush = (): Promise<boolean> => {
    clearTimer();

    if (running) return running;

    if (!pending) return Promise.resolve(true);

    running = (async () => {
      let saved = true;

      while (pending) {
        const current = pending;

        pending = undefined;

        try {
          saved = await persist(current.value);
        } catch {
          saved = false;
        }

        if (current.revision === revision) {
          onStatusChange(saved && current.value !== null ? 'saved' : 'hidden');
        }
      }

      return saved;
    })().finally(() => {
      running = null;
    });

    return running;
  };
  const schedule = (value: Value | null) => {
    clearTimer();
    pending = { value, revision: ++revision };
    onStatusChange(value === null ? 'hidden' : 'saving');
    timer = setTimeout(() => {
      void flush();
    }, DRAFT_AUTOSAVE_DELAY_MS);
  };
  const settle = async () => {
    cancel();
    await running;
  };

  return {
    schedule,
    flush,
    cancel,
    settle,
    markSaved: () => onStatusChange('saved'),
  };
}
