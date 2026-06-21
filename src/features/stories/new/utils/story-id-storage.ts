export const CREATED_STORY_IDS_STORAGE_KEY = 'manyak:created-story-ids';

const CREATED_STORY_IDS_CHANGE_EVENT = 'manyak:created-story-ids-change';

const parseSavedStoryIds = (value: string | null) => {
  if (!value) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (savedStoryId): savedStoryId is number =>
        typeof savedStoryId === 'number' && Number.isInteger(savedStoryId),
    );
  } catch {
    return [];
  }
};

export const parseCreatedStoryIds = parseSavedStoryIds;

/**
 * 서버 렌더링 시점에는 로컬스토리지에 접근할 수 없으므로,
 * 클라이언트에서 읽어온 실제 스냅샷과 구분하기 위한 센티넬 값입니다.
 */
export const SERVER_STORY_IDS_SNAPSHOT = Symbol('server-story-ids-snapshot');

export const subscribeCreatedStoryIds = (onStoreChange: () => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === CREATED_STORY_IDS_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener(CREATED_STORY_IDS_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener(CREATED_STORY_IDS_CHANGE_EVENT, onStoreChange);
  };
};

export const getCreatedStoryIdsSnapshot = (): string | null =>
  localStorage.getItem(CREATED_STORY_IDS_STORAGE_KEY);

export const getServerCreatedStoryIdsSnapshot =
  (): typeof SERVER_STORY_IDS_SNAPSHOT => SERVER_STORY_IDS_SNAPSHOT;

export const writeCreatedStoryIds = (storyIds: number[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(CREATED_STORY_IDS_STORAGE_KEY, JSON.stringify(storyIds));
  window.dispatchEvent(new Event(CREATED_STORY_IDS_CHANGE_EVENT));
};

export const saveCreatedStoryId = (storyId: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  const savedStoryIds = parseSavedStoryIds(
    localStorage.getItem(CREATED_STORY_IDS_STORAGE_KEY),
  );
  const nextStoryIds = [
    storyId,
    ...savedStoryIds.filter((savedStoryId) => savedStoryId !== storyId),
  ].slice(0, 100);

  writeCreatedStoryIds(nextStoryIds);
};

export const removeCreatedStoryId = (storyId: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  const savedStoryIds = parseSavedStoryIds(
    localStorage.getItem(CREATED_STORY_IDS_STORAGE_KEY),
  );

  writeCreatedStoryIds(
    savedStoryIds.filter((savedStoryId) => savedStoryId !== storyId),
  );
};
