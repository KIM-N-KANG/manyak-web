/** 보관하는 ID 개수 상한이다. 넘치면 오래된 ID부터 버린다. */
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
 * 로컬스토리지에 "최근 생성한 ID 목록"을 보관하기 위한 공용 스토리지를 만든다.
 *
 * 스토리/채팅처럼 ID 타입과 키만 다른 동일한 로직을 한 곳에서 관리하기 위한 팩토리다.
 * 서버 렌더링 시점에는 로컬스토리지에 접근할 수 없으므로 쓰기 계열은 모두 no-op으로 동작한다.
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
  /** 저장 문자열을 ID 목록으로 바꾼다. 깨진 JSON이나 배열이 아닌 값은 빈 목록으로, 유효하지 않은 항목은 걸러 낸다. */
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

  /**
   * `useSyncExternalStore`의 구독 함수다. 다른 탭의 `storage` 이벤트와 같은 탭의 `changeEvent`를
   * 함께 듣는다.
   */
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

  /** `useSyncExternalStore`의 스냅샷 함수다. 참조가 안정적인 원문 문자열을 돌려주므로 파싱은 호출부가 한다. */
  const getSnapshot = (): string | null => localStorage.getItem(storageKey);

  /** 목록 전체를 덮어쓰고 같은 탭 구독자에게 알린다. 롤백처럼 이전 목록을 되돌릴 때 쓴다. */
  const write = (ids: Id[]) => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(ids));
    window.dispatchEvent(new Event(changeEvent));
  };

  /** ID를 맨 앞에 넣는다. 이미 있으면 앞으로 옮기고, 상한을 넘으면 뒤에서 자른다. */
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
