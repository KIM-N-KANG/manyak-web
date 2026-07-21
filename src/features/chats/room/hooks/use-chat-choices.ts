'use client';

import { useRef, useState } from 'react';

import { useGenerateChoices } from '@/api/generated/endpoints/chats/chats';

export type ChoicesStatus = {
  turnId: number;
  status: 'loading' | 'error';
};

/**
 * 선택지 생성 트리거 호출과 그 진행 상태를 관리하는 훅(스펙 §3-6 추천 입력 토글).
 * 응답 200은 저장 완료 신호일 뿐 렌더 소스가 아니므로, 성공 시 상세를 재조회해
 * 마지막 턴 `turns[].choices`로 렌더하게 한다. 상태는 대상 턴 id에 귀속되어
 * 새 턴이 시작되면 낡은 상태가 표시에서 자연히 빠진다.
 *
 * @param chatId 대상 채팅 ID
 * @param refetch 채팅 상세 재조회 함수
 * @returns 진행 상태와 생성 트리거 함수
 */
export function useChatChoices(
  chatId: string,
  refetch: () => Promise<unknown>,
) {
  const [choicesStatus, setChoicesStatus] = useState<ChoicesStatus | null>(
    null,
  );
  // 재시도·연속 호출이 겹칠 때 낡은 완료가 최신 상태를 덮지 않도록 최신 요청을 추적한다.
  const latestTurnIdRef = useRef<number | null>(null);
  const { mutateAsync } = useGenerateChoices();

  const generate = async (turnId: number) => {
    latestTurnIdRef.current = turnId;
    setChoicesStatus({ turnId, status: 'loading' });

    try {
      await mutateAsync({ chatId, turnId });
      await refetch();

      if (latestTurnIdRef.current === turnId) {
        setChoicesStatus(null);
      }
    } catch {
      // 실패는 공통 요청 계층이 Sentry에 캡처하므로 여기서는 화면 상태만 바꾼다.
      if (latestTurnIdRef.current === turnId) {
        setChoicesStatus({ turnId, status: 'error' });
      }
    }
  };

  return { choicesStatus, generate };
}
