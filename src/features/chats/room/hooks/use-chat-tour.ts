import { useEffect, useState } from 'react';

import { useGuestConsentOpen } from '@/features/auth/_shared/components/guest-consent-provider';
import { track } from '@/observability/analytics';

import type { ChatTourStepId } from '../components/tour/tour-steps';
import { shouldAutoOpenChatTour } from '../utils/chat-tour-gate';
import { isChatTourSeen, markChatTourSeen } from '../utils/chat-tour-storage';

/**
 * 화면이 준비된 뒤 여는 지연(ms). 사용자가 전송을 시도하기 전에 투어가 먼저 떠야 하므로
 * 짧게 두고, 화면이 그려지자마자 딤이 깔리는 느낌은 피한다. 추천 입력 등장 애니메이션으로
 * 대상이 움직이는 동안은 투어가 열린 채 다시 측정한다(`ChatTour`의 정착 재측정).
 */
const AUTO_OPEN_DELAY_MS = 200;

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
  const isConsentOpen = useGuestConsentOpen();

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
        isConsentOpen,
      })
    ) {
      return;
    }

    const timer = setTimeout(() => {
      setHasAutoOpened(true);
      markChatTourSeen();
      track('client_chat_tour_shown', { chat_id: chatId });
      setIsOpen(true);
    }, AUTO_OPEN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [
    chatId,
    hasAutoOpened,
    isOpen,
    isReady,
    turnCount,
    isStreaming,
    isConsentOpen,
  ]);

  const handleStepView = (stepNumber: number, stepId: ChatTourStepId) => {
    track('client_chat_tourStep_viewed', {
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
    track('client_chat_tourSkipButton_clicked', {
      chat_id: chatId,
      step_number: stepNumber,
    });
    setIsOpen(false);
  };

  return { isOpen, handleStepView, handleComplete, handleSkip };
}
