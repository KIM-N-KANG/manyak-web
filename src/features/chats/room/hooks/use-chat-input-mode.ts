import { useEffect, useState } from 'react';

import {
  CHAT_INPUT_MODE_STORAGE_KEY,
  DEFAULT_CHAT_INPUT_MODE,
} from '../constants';
import { type ChatInputMode, isChatInputMode } from '../lib/chat-input-config';

export type { ChatInputMode } from '../lib/chat-input-config';

/**
 * 채팅 입력 모드를 localStorage에 전역 저장한다. 기본값은 블럭 모드.
 * 서버 렌더링 시점에는 localStorage에 접근할 수 없으므로
 * 기본값으로 렌더링한 뒤 마운트 후 저장된 값을 반영한다.
 *
 * @returns 현재 입력 모드와 모드를 변경하는 함수
 */
export function useChatInputMode() {
  const [mode, setMode] = useState<ChatInputMode>(DEFAULT_CHAT_INPUT_MODE);

  useEffect(() => {
    // 쿠키/스토리지 차단 환경에서는 localStorage 접근 자체가 예외를 던질 수 있으므로
    // 예외 발생 시 기본값을 유지한 채 조용히 넘어간다.
    try {
      const saved = localStorage.getItem(CHAT_INPUT_MODE_STORAGE_KEY);

      if (isChatInputMode(saved)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMode(saved);
      }
    } catch {
      // no-op: 기본값(DEFAULT_CHAT_INPUT_MODE)으로 렌더링을 유지한다.
    }
  }, []);

  const changeMode = (next: ChatInputMode) => {
    setMode(next);

    try {
      localStorage.setItem(CHAT_INPUT_MODE_STORAGE_KEY, next);
    } catch {
      // no-op: 저장에 실패해도 현재 세션의 상태 변경은 유지한다.
    }
  };

  return { mode, changeMode };
}
