import { useEffect, useState } from 'react';

import { useBackLayer } from '@/hooks/use-back-layer';

import { REALTIME_IMAGE_NUDGE_DELAY_MS } from '../constants';

/**
 * 실시간 이미지 안내의 노출 상태를 관리하는 훅.
 * 안내가 요청되면 방금 도착한 응답을 읽을 틈을 둔 뒤 한 번 연다. 그 사이 다음 전송이
 * 시작되면 그 응답이 끝난 뒤 다시 틈을 두고 연다.
 *
 * @param requested 턴 전송 완료로 안내가 요청됐는지 여부
 * @param isStreaming 응답을 받는 중인지 여부
 * @returns 노출 여부와 닫기 핸들러
 */
export function useRealtimeImageNudge(
  requested: boolean,
  isStreaming: boolean,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (!requested || hasOpened || isStreaming) {
      return;
    }

    const timer = setTimeout(() => {
      setHasOpened(true);
      setIsOpen(true);
    }, REALTIME_IMAGE_NUDGE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [requested, hasOpened, isStreaming]);

  const close = () => setIsOpen(false);

  // 안내는 설정 시트 위에 열리므로 뒤로가기 한 번은 안내만 닫고 다음은 시트를 닫는다(Android §74).
  useBackLayer({ open: isOpen, onBack: close });

  return { isOpen, close };
}
