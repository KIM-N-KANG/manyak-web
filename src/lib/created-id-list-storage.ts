const MAX_STORED_ID_COUNT = 100;

type CreatedIdListStorageConfig<Id> = {
  /** 로컬스토리지 키 */
  storageKey: string;
  /** 같은 탭 내 변경을 알리기 위해 dispatch하는 커스텀 이벤트 이름 */
  changeEvent: string;
  /** 저장된 값 중 유효한 ID만 남기기 위한 타입 가드 */
  isValidId: (value: unknown) => value is Id;
};

/**
 * 로컬스토리지에 "최근 생성한 ID 목록"을 보관하기 위한 공용 스토리지를 만듭니다.
 *
 * 스토리/채팅처럼 ID 타입과 키만 다른 동일한 로직을 한 곳에서 관리하기 위한 팩토리입니다.
 * 서버 렌더링 시점에는 로컬스토리지에 접근할 수 없으므로 쓰기 계열은 모두 no-op으로 동작합니다.
 *
 * @param storageKey 로컬스토리지 키
 * @param changeEvent 같은 탭 내 변경을 알리기 위해 dispatch하는 커스텀 이벤트 이름
 * @param isValidId 저장된 값 중 유효한 ID만 남기기 위한 타입 가드
 * @returns ID 목록을 읽고 쓰는 스토리지 함수 모음
 */
export function createCreatedIdListStorage<Id>({
  storageKey,
  changeEvent,
  isValidId,
}: CreatedIdListStorageConfig<Id>) {
  const parseSavedIds = (value: string | null): Id[] => {
    if (!value) {
      return [];
    }

    try {
      const parsedValue: unknown = JSON.parse(value);

      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue.filter(isValidId);
    } catch {
      return [];
    }
  };

  const subscribe = (onStoreChange: () => void) => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey) {
        onStoreChange();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(changeEvent, onStoreChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(changeEvent, onStoreChange);
    };
  };

  const getSnapshot = (): string | null => localStorage.getItem(storageKey);

  const write = (ids: Id[]) => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(ids));
    window.dispatchEvent(new Event(changeEvent));
  };

  const save = (id: Id) => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedIds = parseSavedIds(localStorage.getItem(storageKey));
    const nextIds = [id, ...savedIds.filter((savedId) => savedId !== id)].slice(
      0,
      MAX_STORED_ID_COUNT,
    );

    write(nextIds);
  };

  const remove = (id: Id) => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedIds = parseSavedIds(localStorage.getItem(storageKey));

    write(savedIds.filter((savedId) => savedId !== id));
  };

  return {
    storageKey,
    parseSavedIds,
    subscribe,
    getSnapshot,
    write,
    save,
    remove,
  };
}
