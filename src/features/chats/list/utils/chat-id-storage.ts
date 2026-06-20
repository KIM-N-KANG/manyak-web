export const CREATED_CHAT_IDS_STORAGE_KEY = 'manyak:created-chat-ids';

const parseSavedChatIds = (value: string | null) => {
  if (!value) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (savedChatId): savedChatId is string => typeof savedChatId === 'string',
    );
  } catch {
    return [];
  }
};

export const parseCreatedChatIds = parseSavedChatIds;

/**
 * 서버 렌더링 시점에는 로컬스토리지에 접근할 수 없으므로,
 * 클라이언트에서 읽어온 실제 스냅샷과 구분하기 위한 센티넬 값입니다.
 */
export const SERVER_CHAT_IDS_SNAPSHOT = Symbol('server-chat-ids-snapshot');

export const subscribeCreatedChatIds = (onStoreChange: () => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === CREATED_CHAT_IDS_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => window.removeEventListener('storage', handleStorageChange);
};

export const getCreatedChatIdsSnapshot = (): string | null =>
  localStorage.getItem(CREATED_CHAT_IDS_STORAGE_KEY);

export const getServerCreatedChatIdsSnapshot =
  (): typeof SERVER_CHAT_IDS_SNAPSHOT => SERVER_CHAT_IDS_SNAPSHOT;

export const saveCreatedChatId = (chatId: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const savedChatIds = parseSavedChatIds(
    localStorage.getItem(CREATED_CHAT_IDS_STORAGE_KEY),
  );
  const nextChatIds = [
    chatId,
    ...savedChatIds.filter((savedChatId) => savedChatId !== chatId),
  ].slice(0, 100);

  localStorage.setItem(
    CREATED_CHAT_IDS_STORAGE_KEY,
    JSON.stringify(nextChatIds),
  );
};
