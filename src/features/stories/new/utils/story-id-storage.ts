import { createCreatedIdListStorage } from '@/lib/created-id-list-storage';

export const CREATED_STORY_IDS_STORAGE_KEY = 'manyak:created-story-ids';

const storyIdListStorage = createCreatedIdListStorage<number>({
  storageKey: CREATED_STORY_IDS_STORAGE_KEY,
  changeEvent: 'manyak:created-story-ids-change',
  isValidId: (value): value is number =>
    typeof value === 'number' && Number.isInteger(value),
});

/**
 * 서버 렌더링 시점에는 로컬스토리지에 접근할 수 없으므로,
 * 클라이언트에서 읽어온 실제 스냅샷과 구분하기 위한 센티넬 값입니다.
 */
export const SERVER_STORY_IDS_SNAPSHOT = Symbol('server-story-ids-snapshot');

export const parseCreatedStoryIds = storyIdListStorage.parseSavedIds;

export const subscribeCreatedStoryIds = storyIdListStorage.subscribe;

export const getCreatedStoryIdsSnapshot = storyIdListStorage.getSnapshot;

export const getServerCreatedStoryIdsSnapshot =
  (): typeof SERVER_STORY_IDS_SNAPSHOT => SERVER_STORY_IDS_SNAPSHOT;

export const writeCreatedStoryIds = storyIdListStorage.write;

export const saveCreatedStoryId = storyIdListStorage.save;

export const removeCreatedStoryId = storyIdListStorage.remove;
