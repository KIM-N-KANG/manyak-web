import { useEffect, useState } from 'react';

/**
 * 기기 단위 on/off 설정을 localStorage에 저장한다.
 * 서버 렌더링 시점에는 localStorage에 접근할 수 없으므로
 * 기본값으로 렌더링한 뒤 마운트 후 저장된 값을 반영한다.
 *
 * @param storageKey localStorage 키
 * @param defaultValue 저장값이 없거나 손상됐을 때의 기본값
 * @returns 현재 상태와 상태를 변경하는 함수
 */
export function useStoredToggle(storageKey: string, defaultValue: boolean) {
  const [enabled, setEnabledState] = useState(defaultValue);

  useEffect(() => {
    // 쿠키/스토리지 차단 환경에서는 localStorage 접근 자체가 예외를 던질 수 있으므로
    // 예외 발생 시 기본값을 유지한 채 조용히 넘어간다.
    try {
      const saved = localStorage.getItem(storageKey);

      if (saved === 'true' || saved === 'false') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEnabledState(saved === 'true');
      }
    } catch {
      // no-op: 기본값으로 렌더링을 유지한다.
    }
  }, [storageKey]);

  const setEnabled = (next: boolean) => {
    setEnabledState(next);

    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      // no-op: 저장에 실패해도 현재 세션의 상태 변경은 유지한다.
    }
  };

  return { enabled, setEnabled };
}
