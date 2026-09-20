'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { getMeQueryKey, useMe } from '@/api/generated/endpoints/auth/auth';
import { getGetTrialsQueryKey } from '@/api/generated/endpoints/trial-controller/trial-controller';
import { getGetMyChatsQueryKey } from '@/api/generated/endpoints/users/users';
import type { ChatTurnResponse } from '@/api/generated/models';
import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { ListStatus } from '@/components/common/list-status';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useGuestConsent } from '@/features/auth/_shared/components/guest-consent-provider';
import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { resolvePaymentRequiredReason } from '@/features/auth/_shared/utils/guest-limit-error';
import { getTrialRemaining } from '@/features/auth/_shared/utils/guest-trial';
import { showCreditShortageToast } from '@/features/auth/_shared/utils/show-credit-shortage-toast';
import { CHATS_BATCH_QUERY_KEY } from '@/features/chats/list/hooks/use-created-chats';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useTrials } from '@/hooks/use-trials';
import { track, useTrackOnView } from '@/observability/analytics';

import {
  CHAT_CHOICES_ENABLED_STORAGE_KEY,
  CHAT_REALTIME_IMAGE_ENABLED_STORAGE_KEY,
} from '../constants';
import { useChatChoices } from '../hooks/use-chat-choices';
import { useChatChoicesHint } from '../hooks/use-chat-choices-hint';
import { useChatComposer } from '../hooks/use-chat-composer';
import { useChatDetail } from '../hooks/use-chat-detail';
import {
  type ChatInputMode,
  useChatInputMode,
} from '../hooks/use-chat-input-mode';
import { useChatStream } from '../hooks/use-chat-stream';
import { useChatTour } from '../hooks/use-chat-tour';
import { useStoredToggle } from '../hooks/use-stored-toggle';
import {
  clearChatLoginDraft,
  readChatLoginDraft,
  saveChatLoginDraft,
} from '../utils/chat-login-draft-storage';
import { calcChatTurnCost } from '../utils/chat-turn-cost';
import { shouldGenerateChoices } from '../utils/should-generate-choices';
import { ChatRoomHeader } from './header/chat-room-header';
import { ChatInput } from './input/chat-input';
import { ChatMessages } from './messages/chat-messages';
import { ChatTour } from './tour/chat-tour';

type ChatRoomProps = {
  chatId: string;
};

export function ChatRoom({ chatId }: ChatRoomProps) {
  const queryClient = useQueryClient();
  const { status: sessionStatus } = useSession();
  const requestConsent = useGuestConsent();
  const trials = useTrials();
  const policy = useCreditPolicy();
  const { isMember } = useMemberAccess();
  const { data: meData } = useMe({ query: { enabled: isMember } });
  const creditBalance =
    meData?.status === 200 ? meData.data.creditBalance : undefined;
  const [loginOpen, setLoginOpen] = useState(false);
  const lastSubmitted = useRef<string | null>(null);
  const handlePaymentRequired = (error: unknown) => {
    if (
      resolvePaymentRequiredReason(error, sessionStatus) === 'guest-trial-limit'
    ) {
      if (lastSubmitted.current !== null)
        saveChatLoginDraft(chatId, lastSubmitted.current);

      setLoginOpen(true);

      return;
    }

    if (
      resolvePaymentRequiredReason(error, sessionStatus) ===
      'insufficient-credit'
    ) {
      showCreditShortageToast('chat_turn');

      return;
    }

    toast.error(TOAST_MESSAGE.RESPONSE_STREAM_FAILED);
  };
  const {
    storyId,
    storyTitle,
    prologue,
    turns,
    suggestedInputs,
    isLoading,
    isError,
    isForbidden,
    refetch,
  } = useChatDetail(chatId);

  useDocumentTitle(storyTitle);

  const { enabled: choicesEnabled, setEnabled: setChoicesEnabled } =
    useStoredToggle(CHAT_CHOICES_ENABLED_STORAGE_KEY, true);
  const { enabled: realtimeImageEnabled, setEnabled: setRealtimeImageEnabled } =
    useStoredToggle(CHAT_REALTIME_IMAGE_ENABLED_STORAGE_KEY, true);
  const { choicesStatus, generate: generateChoicesForTurn } = useChatChoices(
    chatId,
    refetch,
  );
  const handleStreamCompleted = async () => {
    lastSubmitted.current = null;
    clearChatLoginDraft(chatId);
    void queryClient.invalidateQueries({ queryKey: getGetTrialsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });

    const result = await refetch();

    await queryClient.invalidateQueries({ queryKey: [CHATS_BATCH_QUERY_KEY] });
    await queryClient.invalidateQueries({ queryKey: getGetMyChatsQueryKey() });

    const detail = result.data?.status === 200 ? result.data.data : undefined;
    const lastTurn = (detail?.turns as ChatTurnResponse[] | undefined)?.at(-1);

    if (
      lastTurn?.id != null &&
      shouldGenerateChoices({
        enabled: choicesEnabled,
        isStreaming: false,
        lastTurn,
      })
    ) {
      void generateChoicesForTurn(lastTurn.id);
    }
  };

  const { streamingTurn, isStreaming, send, regenerate, regeneratingTurnId } =
    useChatStream(
      chatId,
      turns.length,
      handleStreamCompleted,
      handlePaymentRequired,
      refetch,
      realtimeImageEnabled,
    );

  const tour = useChatTour({
    chatId,
    isReady: !isLoading && !isError && !isForbidden,
    turnCount: turns.length,
    isStreaming,
  });

  const showsChoicesHint = useChatChoicesHint({
    isReady: !isLoading && !isError && !isForbidden,
    turnCount: turns.length,
  });

  /**
   * 아는 잔액이 이번 턴 비용에 못 미치는지. 잔액·정책·체험 중 하나라도 모르면 막지 않는다.
   * 판단은 서버(402) 몫이고, 여기서 막는 것은 확실히 모자랄 때 왕복을 줄이는 것뿐이다.
   */
  const isCreditShort = () => {
    if (creditBalance === undefined) return false;

    const cost = calcChatTurnCost({
      chatTurnCost: policy?.chatTurnCost,
      chatImageCost: policy?.chatImageCost,
      withRealtimeImage: realtimeImageEnabled,
      turnRemaining: getTrialRemaining(trials, 'chatTurn'),
      imageRemaining: getTrialRemaining(trials, 'chatImage'),
    });
    const required = cost.discounted ?? cost.full;

    return required !== undefined && creditBalance < required;
  };

  const canUseChat = async (onLimit?: () => void) => {
    if (!(await requestConsent())) return false;

    if (
      sessionStatus === 'unauthenticated' &&
      getTrialRemaining(trials, 'chatTurn') === 0
    ) {
      onLimit?.();
      setLoginOpen(true);

      return false;
    }

    // 서버도 402로 막지만, 그 뒤에 되돌리면 보낸 모습이 잠깐 보였다 사라진다. 아는 잔액으로
    // 먼저 걸러 컴포저를 건드리지 않는다. 잔액은 화면이 서버와 어긋났을 수 있어 다시 읽는다.
    if (isCreditShort()) {
      showCreditShortageToast('chat_turn');
      void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });

      return false;
    }

    return true;
  };

  const guardedRegenerate = async (turn: ChatTurnResponse): Promise<void> => {
    track('client_chat_regenerateButton_clicked', {
      chat_id: chatId,
      turn_number: turns.length,
    });

    if (!(await canUseChat())) {
      return;
    }

    return regenerate(turn);
  };

  const { mode, changeMode } = useChatInputMode();
  const [initialDraft] = useState(() => readChatLoginDraft(chatId));

  useEffect(() => {
    clearChatLoginDraft(chatId);
  }, [chatId]);

  const suggestions =
    turns.length === 0
      ? suggestedInputs
      : choicesEnabled
        ? (turns.at(-1)?.choices ?? [])
        : [];
  const suggestionSourceTurnId =
    turns.length === 0 ? undefined : (turns.at(-1)?.id ?? undefined);

  const composer = useChatComposer({
    chatId,
    turnCount: turns.length,
    isStreaming,
    inputMode: mode,
    suggestions,
    suggestionSourceTurnId,
    canSend: () =>
      canUseChat(() => saveChatLoginDraft(chatId, composer.serializeDraft())),
    initialDraft,
    onSend: (text, source, selection) => {
      lastSubmitted.current = text;

      void send(text, source, selection);
    },
  });

  const [pendingFill, setPendingFill] = useState<{
    text: string;
    position: number;
    sourceTurnId?: number;
  } | null>(null);

  const handleFillChoice = (
    text: string,
    position: number,
    sourceTurnId?: number,
  ) => {
    if (composer.hasDraft) {
      setPendingFill({ text, position, sourceTurnId });

      return;
    }

    composer.fillChoice(text, position, sourceTurnId);
  };

  const confirmFillChoice = () => {
    if (pendingFill) {
      composer.fillChoice(
        pendingFill.text,
        pendingFill.position,
        pendingFill.sourceTurnId,
      );
    }

    setPendingFill(null);
  };

  const handleChoicesEnabledChange = (next: boolean) => {
    if (next === choicesEnabled) {
      return;
    }

    track('client_chat_choicesToggle_clicked', {
      chat_id: chatId,
      enabled: next,
    });
    setChoicesEnabled(next);

    const lastTurn = turns.at(-1);

    if (
      next &&
      lastTurn?.id != null &&
      shouldGenerateChoices({ enabled: next, isStreaming, lastTurn })
    ) {
      void generateChoicesForTurn(lastTurn.id);
    }
  };

  const handleRetryChoices = () => {
    const lastTurn = turns.at(-1);

    if (lastTurn?.id != null) {
      void generateChoicesForTurn(lastTurn.id);
    }
  };

  const handleModeChange = (nextMode: ChatInputMode) => {
    if (nextMode !== mode) {
      track('client_chat_inputMode_selected', {
        chat_id: chatId,
        mode: nextMode,
      });
    }

    composer.convertTo(nextMode);
    changeMode(nextMode);
  };

  useTrackOnView('client_chat_viewed', { chat_id: chatId });

  useEffect(() => {
    if (isError) {
      track('client_chat_loadError_shown', { chat_id: chatId });
    }
  }, [isError, chatId]);

  let stateKey: string;
  let content: ReactNode;

  if (isLoading) {
    stateKey = 'loading';
    content = <PageLoadingSpinner aria-label="채팅을 불러오는 중" />;
  } else if (isForbidden) {
    stateKey = 'forbidden';
    content = (
      <ListStatus
        title="지금 계정에서는 볼 수 없어요"
        description="스토리와 채팅을 이미 한 번 옮긴 계정이라 옮기지 못했어요">
        <Button
          nativeButton={false}
          variant="outline"
          size="lg"
          render={<Link href={APP_PATH.MAIN.CHATS} />}>
          채팅 목록으로 가기
        </Button>
      </ListStatus>
    );
  } else if (isError) {
    stateKey = 'error';
    content = (
      <RetryListStatus
        title="채팅을 불러오지 못했어요"
        onRetry={() => {
          track('client_chat_retryButton_clicked', { chat_id: chatId });
          refetch();
        }}
      />
    );
  } else {
    stateKey = 'content';
    content = (
      <>
        <ChatRoomHeader
          chatId={chatId}
          storyId={storyId}
          storyTitle={storyTitle}
          turnCount={turns.length}
        />
        <div className="flex min-h-0 flex-1 flex-col">
          <ChatMessages
            prologue={prologue}
            turns={turns}
            suggestedInputs={suggestedInputs}
            streamingTurn={streamingTurn}
            regeneratingTurnId={regeneratingTurnId}
            choicesEnabled={choicesEnabled}
            choicesStatus={choicesStatus}
            showsChoicesHint={showsChoicesHint}
            onSendChoice={composer.sendChoice}
            onFillChoice={handleFillChoice}
            onRegenerate={guardedRegenerate}
            onRetryChoices={handleRetryChoices}
            onCharacterImageZoom={() =>
              track('client_chat_characterImage_clicked', { chat_id: chatId })
            }
          />
        </div>
        <ChatInput
          mode={mode}
          onModeChange={handleModeChange}
          composer={composer}
          isStreaming={isStreaming}
          realtimeImageEnabled={realtimeImageEnabled}
          onRealtimeImageEnabledChange={setRealtimeImageEnabled}
          choicesEnabled={choicesEnabled}
          onChoicesEnabledChange={handleChoicesEnabledChange}
          isMember={sessionStatus === 'authenticated'}
        />
        <ConfirmAlertDialog
          open={pendingFill !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPendingFill(null);
            }
          }}
          onConfirm={confirmFillChoice}
          title="작성 중인 내용을 바꿀까요?"
          description="지금 작성 중인 내용은 사라져요"
          cancelLabel="그대로 두기"
          confirmLabel="바꾸기"
        />
        <LoginRequiredSheet open={loginOpen} onOpenChange={setLoginOpen} />
        {tour.isOpen && (
          <ChatTour
            inputMode={mode}
            onStepView={tour.handleStepView}
            onComplete={tour.handleComplete}
            onSkip={tour.handleSkip}
          />
        )}
      </>
    );
  }

  return (
    <FadeStateSwitch
      stateKey={stateKey}
      className="relative flex h-full min-h-0 flex-col">
      {content}
    </FadeStateSwitch>
  );
}
