import { useEffect, useState } from 'react';

export type ChatInputMode = 'block' | 'plain';

export const CHAT_INPUT_MODE_STORAGE_KEY = 'manyak:chat-input-mode';

const DEFAULT_MODE: ChatInputMode = 'block';

function isChatInputMode(value: string | null): value is ChatInputMode {
  return value === 'block' || value === 'plain';
}

/**
 * 채팅 입력 모드를 localStorage에 전역 저장한다. 기본값은 블럭 모드.
 * 서버 렌더링 시점에는 localStorage에 접근할 수 없으므로
 * 기본값으로 렌더링한 뒤 마운트 후 저장된 값을 반영한다.
 */
export function useChatInputMode() {
  const [mode, setMode] = useState<ChatInputMode>(DEFAULT_MODE);

  useEffect(() => {
    const saved = localStorage.getItem(CHAT_INPUT_MODE_STORAGE_KEY);

    if (isChatInputMode(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(saved);
    }
  }, []);

  const changeMode = (next: ChatInputMode) => {
    setMode(next);
    localStorage.setItem(CHAT_INPUT_MODE_STORAGE_KEY, next);
  };

  return { mode, changeMode };
}
