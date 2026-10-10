import { useEffect } from 'react';

import { useBackLayer } from '@/hooks/use-back-layer';
import { confirmLeaveLayers, leaveLayers } from '@/lib/history-layers';

type UsePreventPageLeaveOptions = {
  /** 새로고침·탭 닫기·주소창 이동 시 브라우저 기본 확인창을 띄울지 */
  warnOnUnload: boolean;
  /** 브라우저·모바일 뒤로가기를 가드 레이어로 흡수할지 */
  interceptBack: boolean;
  onBackAttempt: () => void;
};

/**
 * 퍼널처럼 단일 URL에서 진행되는 화면의 이탈을 가로채는 훅.
 *
 * - `warnOnUnload`: `beforeunload`로 브라우저 기본 확인창을 띄운다.
 *   (브라우저 보안 정책상 커스텀 다이얼로그는 표시할 수 없다.)
 * - `interceptBack`: 히스토리 레이어 매니저의 `guard` 레이어로 뒤로가기를 흡수하고 `onBackAttempt`를
 *   호출한다. 퍼널 위에 열린 시트·다이얼로그는 자기 레이어가 먼저 받으므로 가드는 그 아래에서만 반응한다.
 *
 * 두 가드는 따로 켠다. 지울 내용이 없어 경고가 불필요한 스텝에서도, 돌아갈 앱 내
 * 히스토리가 없으면 뒤로가기만은 흡수해야 하기 때문이다.
 *
 * @param warnOnUnload 새로고침·탭 닫기 경고를 띄울지 여부
 * @param interceptBack 뒤로가기를 흡수할지 여부
 * @param onBackAttempt 뒤로가기를 흡수했을 때 호출되는 콜백
 * @returns 이탈 확정(`confirmLeave`)과 정리 후 이동(`leaveAfterCleanup`) 함수
 */
export function usePreventPageLeave({
  warnOnUnload,
  interceptBack,
  onBackAttempt,
}: UsePreventPageLeaveOptions) {
  useEffect(() => {
    if (!warnOnUnload) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // preventDefault만으로 브라우저 기본 확인창을 띄운다(모던 브라우저 기준).
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [warnOnUnload]);

  useBackLayer({ open: interceptBack, kind: 'guard', onBack: onBackAttempt });

  /** 사용자가 이탈을 확정했을 때. 가드와 그 위 레이어를 버리고 퍼널 진입 직전 화면으로 돌아간다. */
  const confirmLeave = () => confirmLeaveLayers();

  /** 정상 흐름(예: 생성 완료 후 채팅방 이동)으로 떠나기 전 더미를 모두 정리한 뒤 이동한다. */
  const leaveAfterCleanup = (navigate: () => void) => leaveLayers(navigate);

  return { confirmLeave, leaveAfterCleanup };
}
