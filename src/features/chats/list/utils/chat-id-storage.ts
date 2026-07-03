import { createCreatedIdListStorage } from '@/lib/created-id-list-storage';

export const CREATED_CHAT_IDS_STORAGE_KEY = 'manyak:created-chat-ids';

const chatIdListStorage = createCreatedIdListStorage<string>({
  storageKey: CREATED_CHAT_IDS_STORAGE_KEY,
  changeEvent: `${CREATED_CHAT_IDS_STORAGE_KEY}-change`,
  isValidId: (value): value is string => typeof value === 'string',
});

/**
 * 서버 렌더링 시점에는 로컬스토리지에 접근할 수 없으므로,
 * 클라이언트에서 읽어온 실제 스냅샷과 구분하기 위한 센티넬 값입니다.
 */
export const SERVER_CHAT_IDS_SNAPSHOT = Symbol('server-chat-ids-snapshot');

export const parseCreatedChatIds = chatIdListStorage.parseSavedIds;

export const subscribeCreatedChatIds = chatIdListStorage.subscribe;

export const getCreatedChatIdsSnapshot = chatIdListStorage.getSnapshot;

export const getServerCreatedChatIdsSnapshot =
  (): typeof SERVER_CHAT_IDS_SNAPSHOT => SERVER_CHAT_IDS_SNAPSHOT;

export const writeCreatedChatIds = chatIdListStorage.write;

export const saveCreatedChatId = chatIdListStorage.save;

export const removeCreatedChatId = chatIdListStorage.remove;
