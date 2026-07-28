import { useEffect, useState } from 'react';

import { track } from '@/observability/analytics';

import type { ChatTourStepId } from '../components/tour/tour-steps';
import { shouldAutoOpenChatTour } from '../utils/chat-tour-gate';
import { isChatTourSeen, markChatTourSeen } from '../utils/chat-tour-storage';

/** 추천 입력 등장 스태거 애니메이션이 끝난 뒤 측정하기 위한 지연(ms). */
const AUTO_OPEN_DELAY_MS = 600;

type UseChatTourParams = {
  chatId: string;
  isReady: boolean;
  turnCount: number;
  isStreaming: boolean;
};

/**
 * 채팅 화면 안내 투어의 노출 상태를 관리하는 훅.
 * 조건을 충족한 첫 진입에 한 번만 자동 노출한다.
 *
 * @param params 채팅 ID와 자동 노출 판정에 쓰는 화면 상태
 * @returns 노출 여부와 스텝·완료·건너뛰기 핸들러
 */
export function useChatTour({
  chatId,
  isReady,
  turnCount,
  isStreaming,
}: UseChatTourParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  useEffect(() => {
    if (hasAutoOpened || isOpen) {
      return;
    }

    if (
      !shouldAutoOpenChatTour({
        isReady,
        turnCount,
        isStreaming,
        seen: isChatTourSeen(),
      })
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setHasAutoOpened(true);
      markChatTourSeen();
      track('client_chat_tour_started', { chat_id: chatId });
      setIsOpen(true);
    }, AUTO_OPEN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [chatId, hasAutoOpened, isOpen, isReady, turnCount, isStreaming]);

  const handleStepView = (stepNumber: number, stepId: ChatTourStepId) => {
    track('client_chat_tour_step_viewed', {
      chat_id: chatId,
      step_number: stepNumber,
      step_id: stepId,
    });
  };

  const handleComplete = () => {
    track('client_chat_tour_completed', { chat_id: chatId });
    setIsOpen(false);
  };

  const handleSkip = (stepNumber: number) => {
    track('client_chat_tour_skipped', {
      chat_id: chatId,
      step_number: stepNumber,
    });
    setIsOpen(false);
  };

  return { isOpen, handleStepView, handleComplete, handleSkip };
}
