/** 편집 임시 저장 디바운스 시간(ms) */
export const DRAFT_AUTOSAVE_DELAY_MS = 300;

/** 헤더에 표시할 편집 임시 저장 상태 */
export type DraftSaveStatus = 'hidden' | 'saving' | 'saved';

type DraftAutosaveOptions<Value> = {
  persist: (value: Value | null) => boolean;
  onStatusChange: (status: DraftSaveStatus) => void;
};

/** 300ms 자동 저장 타이머를 관리하는 순수 컨트롤러 */
export type DraftAutosaveController<Value> = {
  schedule: (value: Value | null) => void;
  flush: () => boolean;
  cancel: () => void;
  markSaved: () => void;
};

/**
 * 마지막 편집값만 300ms 뒤 저장하는 컨트롤러를 만든다.
 * null은 저장할 입력이 없어 기존 keyword draft를 정리하는 상태를 뜻한다.
 *
 * @param options 저장 함수와 상태 변경 콜백
 * @returns 예약·즉시 저장·취소 컨트롤러
 */
export function createDraftAutosave<Value>({
  persist,
  onStatusChange,
}: DraftAutosaveOptions<Value>): DraftAutosaveController<Value> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: Value | null | undefined;

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = null;
    pendingValue = undefined;
  };

  const flush = () => {
    if (pendingValue === undefined) {
      return false;
    }

    const value = pendingValue;

    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = null;
    pendingValue = undefined;

    const saved = persist(value);

    onStatusChange(saved ? 'saved' : 'hidden');

    return saved;
  };

  const schedule = (value: Value | null) => {
    if (timer !== null) {
      clearTimeout(timer);
    }

    pendingValue = value;
    onStatusChange(value === null ? 'hidden' : 'saving');
    timer = setTimeout(flush, DRAFT_AUTOSAVE_DELAY_MS);
  };

  const markSaved = () => onStatusChange('saved');

  return { schedule, flush, cancel, markSaved };
}
