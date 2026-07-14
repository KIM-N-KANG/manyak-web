import { createCreatedIdListStorage } from '@/lib/created-id-list-storage';

/** 생성한 채팅 ID 목록을 보관하는 로컬스토리지 키 */
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

/** 저장된 원본 문자열을 채팅 ID 배열로 파싱한다. */
export const parseCreatedChatIds = chatIdListStorage.parseSavedIds;

/** 채팅 ID 목록 변경을 구독한다. */
export const subscribeCreatedChatIds = chatIdListStorage.subscribe;

/** 로컬스토리지에서 채팅 ID 목록의 현재 스냅샷을 읽는다. */
export const getCreatedChatIdsSnapshot = chatIdListStorage.getSnapshot;

/**
 * 서버 렌더링용 스냅샷. 항상 센티넬 값을 반환한다.
 *
 * @returns 서버 렌더링용 센티넬 스냅샷 값
 */
export const getServerCreatedChatIdsSnapshot =
  (): typeof SERVER_CHAT_IDS_SNAPSHOT => SERVER_CHAT_IDS_SNAPSHOT;

/** 채팅 ID 목록 전체를 덮어쓴다. */
export const writeCreatedChatIds = chatIdListStorage.write;

/** 채팅 ID 하나를 목록에 추가한다. */
export const saveCreatedChatId = chatIdListStorage.save;

/** 채팅 ID 하나를 목록에서 제거한다. */
export const removeCreatedChatId = chatIdListStorage.remove;
