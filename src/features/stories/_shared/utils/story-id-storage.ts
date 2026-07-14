import { createCreatedIdListStorage } from '@/lib/created-id-list-storage';

/** 생성한 스토리 ID 목록을 저장하는 로컬스토리지 키 */
export const CREATED_STORY_IDS_STORAGE_KEY = 'manyak:created-story-ids';

const storyIdListStorage = createCreatedIdListStorage<string>({
  storageKey: CREATED_STORY_IDS_STORAGE_KEY,
  changeEvent: `${CREATED_STORY_IDS_STORAGE_KEY}-change`,
  isValidId: (value): value is string => typeof value === 'string',
});

/**
 * 서버 렌더링 시점에는 로컬스토리지에 접근할 수 없으므로,
 * 클라이언트에서 읽어온 실제 스냅샷과 구분하기 위한 센티넬 값이다.
 */
export const SERVER_STORY_IDS_SNAPSHOT = Symbol('server-story-ids-snapshot');

/** 저장된 원본 문자열을 스토리 ID 배열로 파싱한다. */
export const parseCreatedStoryIds = storyIdListStorage.parseSavedIds;

/** 스토리 ID 목록 변경을 구독한다. */
export const subscribeCreatedStoryIds = storyIdListStorage.subscribe;

/** 로컬스토리지에 저장된 스토리 ID 목록의 현재 스냅샷을 반환한다. */
export const getCreatedStoryIdsSnapshot = storyIdListStorage.getSnapshot;

/**
 * 서버 렌더링 시점의 스냅샷으로 센티넬 값을 반환한다.
 *
 * @returns 서버 스냅샷 센티넬 값
 */
export const getServerCreatedStoryIdsSnapshot =
  (): typeof SERVER_STORY_IDS_SNAPSHOT => SERVER_STORY_IDS_SNAPSHOT;

/** 스토리 ID 목록 전체를 덮어쓴다. */
export const writeCreatedStoryIds = storyIdListStorage.write;

/** 생성한 스토리 ID를 목록에 추가한다. */
export const saveCreatedStoryId = storyIdListStorage.save;

/** 스토리 ID를 목록에서 제거한다. */
export const removeCreatedStoryId = storyIdListStorage.remove;
