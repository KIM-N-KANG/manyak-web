import { useEffect, useEffectEvent } from 'react';

/**
 * 화면이 가려질 때(탭 전환, 앱 전환, 화면 잠금, 탭 닫기와 새로고침 직전) 저장을 부르는 훅.
 * Android의 `SaveDraftWhenBackgrounded`(Activity `ON_STOP`)에 대응한다.
 *
 * 앱 안 이동(나가기 확인 뒤 라우팅)은 문서가 그대로라 이벤트가 생기지 않아 저장하지 않는다.
 * 문서가 내려가는 경우는 비동기 쓰기의 완료가 보장되지 않으므로 이탈 경고를 대신하지 않는다.
 *
 * @param onSave 저장 함수. 저장할 것이 없을 때 건너뛰는 판단은 호출부가 맡는다.
 */
export function useSaveWhenBackgrounded(onSave: () => void) {
  const save = useEffectEvent(onSave);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save();
    };
    // iOS Safari는 페이지를 떠날 때 visibilitychange를 빠뜨리기도 한다. 이미 숨김으로 바뀌었으면
    // visibilitychange가 저장했으므로 건너뛰어 한 번만 저장한다.
    const handlePageHide = () => {
      if (document.visibilityState !== 'hidden') save();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);
}
