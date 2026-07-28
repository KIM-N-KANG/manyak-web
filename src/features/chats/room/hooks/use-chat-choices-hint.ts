import { useEffect, useState } from 'react';

import {
  isChatChoicesHintSeen,
  markChatChoicesHintSeen,
} from '../utils/chat-choices-hint-storage';

type UseChatChoicesHintParams = {
  isReady: boolean;
  turnCount: number;
};

/**
 * 첫 추천 입력 목록에 붙는 1회성 힌트의 노출 여부를 관리하는 훅.
 * 미열람 사용자가 턴 0개 채팅에 들어오면 켜고, 노출되는 순간 열람으로 기록한다.
 * 마운트 시점의 미열람 여부를 고정하므로 같은 방에 머무는 동안은 계속 보인다.
 *
 * @param params 노출 판정에 쓰는 화면 상태
 * @returns 힌트를 보여줄지 여부
 */
export function useChatChoicesHint({
  isReady,
  turnCount,
}: UseChatChoicesHintParams): boolean {
  const [wasUnseen] = useState(() => !isChatChoicesHintSeen());
  const showsHint = wasUnseen && isReady && turnCount === 0;

  useEffect(() => {
    if (showsHint) {
      markChatChoicesHintSeen();
    }
  }, [showsHint]);

  return showsHint;
}
