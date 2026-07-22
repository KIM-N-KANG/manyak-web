import { useEffect, useState } from 'react';

import { CHAT_CHOICES_ENABLED_STORAGE_KEY } from '../constants';

/**
 * 추천 입력(선택지) 생성 토글 상태를 localStorage에 기기 단위로 저장한다. 기본값은 on이다.
 * 서버 렌더링 시점에는 localStorage에 접근할 수 없으므로
 * 기본값으로 렌더링한 뒤 마운트 후 저장된 값을 반영한다.
 *
 * @returns 토글 상태와 상태를 변경하는 함수
 */
export function useChoicesToggle() {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    // 쿠키/스토리지 차단 환경에서는 localStorage 접근 자체가 예외를 던질 수 있으므로
    // 예외 발생 시 기본값(on)을 유지한 채 조용히 넘어간다.
    try {
      const saved = localStorage.getItem(CHAT_CHOICES_ENABLED_STORAGE_KEY);

      if (saved === 'false') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEnabledState(false);
      }
    } catch {
      // no-op: 기본값(on)으로 렌더링을 유지한다.
    }
  }, []);

  const setEnabled = (next: boolean) => {
    setEnabledState(next);

    try {
      localStorage.setItem(CHAT_CHOICES_ENABLED_STORAGE_KEY, String(next));
    } catch {
      // no-op: 저장에 실패해도 현재 세션의 상태 변경은 유지한다.
    }
  };

  return { enabled, setEnabled };
}
