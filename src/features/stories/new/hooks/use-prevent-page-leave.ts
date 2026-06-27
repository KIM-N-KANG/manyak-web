import { useEffect, useRef } from 'react';

type UsePreventPageLeaveOptions = {
  enabled: boolean;
  onBackAttempt: () => void;
};

/**
 * 퍼널처럼 단일 URL에서 진행되는 화면의 이탈을 가로채는 훅.
 *
 * - 새로고침 / 탭 닫기 / 주소창 이동: `beforeunload`로 브라우저 기본 확인창을 띄운다.
 *   (브라우저 보안 정책상 커스텀 다이얼로그는 표시할 수 없다.)
 * - 브라우저/모바일 뒤로가기: 더미 히스토리 항목으로 뒤로가기를 흡수하고
 *   `onBackAttempt`를 호출해 커스텀 다이얼로그를 띄울 수 있게 한다.
 *
 * `enabled`인 동안 더미 항목은 항상 1개만 유지된다(popstate마다 다시 쌓음).
 * 따라서 실제 이탈 시 `confirmLeave`는 더미 + 현재 페이지를 건너뛰어야 한다.
 */
export function usePreventPageLeave({
  enabled,
  onBackAttempt,
}: UsePreventPageLeaveOptions) {
  const onBackAttemptRef = useRef(onBackAttempt);
  const teardownRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onBackAttemptRef.current = onBackAttempt;
  }, [onBackAttempt]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // preventDefault만으로 브라우저 기본 확인창을 띄운다(모던 브라우저 기준).
      event.preventDefault();
    };

    const handlePopState = () => {
      // 뒤로가기로 더미 항목을 빠져나왔으므로 다시 쌓아 현재 위치를 유지한다.
      window.history.pushState(null, '', window.location.href);
      onBackAttemptRef.current();
    };

    // 브라우저/모바일 뒤로가기를 흡수할 더미 히스토리 항목
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    const teardown = () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };

    teardownRef.current = teardown;

    return () => {
      teardown();
      teardownRef.current = null;
    };
  }, [enabled]);

  /**
   * 사용자가 이탈을 확정했을 때. 가드를 해제하고 더미 항목과 현재 페이지를
   * 건너뛰어 퍼널 진입 직전 화면으로 돌아간다.
   */
  const confirmLeave = () => {
    teardownRef.current?.();
    teardownRef.current = null;
    window.history.go(-2);
  };

  /**
   * 정상 흐름(예: 생성 완료 후 채팅방 이동)으로 떠나기 전, 더미 항목만 정리한 뒤
   * 전달받은 이동 동작을 실행한다. 더미를 정리하지 않으면 이동 후 히스토리에
   * 더미가 남아 뒤로가기 동선이 꼬인다.
   */
  const leaveAfterCleanup = (navigate: () => void) => {
    const teardown = teardownRef.current;

    if (!teardown) {
      navigate();

      return;
    }

    teardown();
    teardownRef.current = null;

    const handlePopStateOnce = () => {
      window.removeEventListener('popstate', handlePopStateOnce);
      navigate();
    };

    // 더미 항목을 소비(같은 URL이라 화면 변화 없음)한 뒤 실제 이동을 수행한다.
    window.addEventListener('popstate', handlePopStateOnce);
    window.history.back();
  };

  return { confirmLeave, leaveAfterCleanup };
}
