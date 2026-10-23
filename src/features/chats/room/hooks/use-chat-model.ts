'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  type getChatDetailResponseSuccess,
  getGetChatDetailQueryKey,
  useChangeSettings,
  useGetModels,
} from '@/api/generated/endpoints/chats/chats';
import { TOAST_MESSAGE } from '@/constants/toast-message';

import { CHAT_TRIAL_MODEL_CODE } from '../constants';

type UseChatModelOptions = {
  /** 회원 세션인지 여부 */
  isMember: boolean;
  /** 채팅 모델을 모를 때 쓸 턴 비용(정책의 라이트 턴 비용) */
  fallbackTurnCost: number | undefined;
  /** 게스트가 체험 모델이 아닌 모델을 골랐을 때 호출된다 */
  onGuestSelect: () => void;
};

/**
 * 채팅방의 AI 모델 목록, 적용 중인 모델과 그 턴 비용, 채팅 설정(모델, 긴 응답) 변경을 다루는 훅.
 *
 * 모델은 서버가 채팅마다 저장하고 채팅 상세가 적용 중인 모델을 준다. 게스트의 턴은 서버가 고른 모델과
 * 무관하게 체험 모델로 응답하므로 체험 모델을 적용 중으로 보이고, 다른 모델을 고르면 로그인을 유도한다.
 * 서버가 채팅 모델을 주지 않으면(모델 선택 배포 전) 모델 코드를 비우고 대신 받은 턴 비용을 쓴다.
 *
 * @param chatId 채팅 ID
 * @param chatModel 채팅 상세가 준 모델 코드
 * @param chatLongResponse 채팅 상세가 준 긴 응답 설정
 * @param options 회원 여부, 대신 쓸 턴 비용, 게스트 선택 콜백
 * @returns 모델 목록, 적용 중인 모델 코드와 턴 비용, 모델을 바꾸는 함수, 긴 응답 설정과 그것을 바꾸는 함수
 */
export function useChatModel(
  chatId: string,
  chatModel: string | undefined,
  chatLongResponse: boolean | undefined,
  { isMember, fallbackTurnCost, onGuestSelect }: UseChatModelOptions,
) {
  const queryClient = useQueryClient();
  const { data } = useGetModels();
  const { mutate } = useChangeSettings();
  const models = data?.status === 200 ? data.data : [];
  const modelCode =
    chatModel === undefined || isMember ? chatModel : CHAT_TRIAL_MODEL_CODE;
  const turnCost =
    modelCode === undefined
      ? fallbackTurnCost
      : models.find((model) => model.code === modelCode)?.turnCost;

  // 서버가 값을 주지 않으면(긴 응답 배포 전) 서버 기본값인 짧은 응답으로 본다.
  const longResponse = chatLongResponse ?? false;

  const patchChatDetail = (
    settings: Pick<
      getChatDetailResponseSuccess['data'],
      'model' | 'longResponse'
    >,
  ) =>
    queryClient.setQueryData<getChatDetailResponseSuccess>(
      getGetChatDetailQueryKey(chatId),
      (prev) =>
        prev?.status === 200
          ? { ...prev, data: { ...prev.data, ...settings } }
          : prev,
    );

  /**
   * 모델을 바꾼다. 화면은 먼저 바꾸고, 서버가 거절하면 이전 모델로 되돌린 뒤 실패를 알린다.
   * 진행 중인 턴은 시작할 때의 모델을 유지하고 다음 턴부터 적용된다(서버 계약).
   */
  const select = (next: string) => {
    if (next === modelCode) return;

    if (!isMember) {
      onGuestSelect();

      return;
    }

    patchChatDetail({ model: next });
    mutate(
      { chatId, data: { model: next } },
      {
        onError: () => {
          patchChatDetail({ model: chatModel });
          toast.error(TOAST_MESSAGE.CHAT_MODEL_CHANGE_FAILED);
        },
      },
    );
  };

  /**
   * 긴 응답을 켜고 끈다. 모델과 같이 채팅마다 서버에 저장하고, 화면을 먼저 바꾼 뒤 서버가 거절하면 되돌린다.
   * 게스트도 자기 채팅의 설정을 바꿀 수 있어 로그인을 요구하지 않는다.
   */
  const setLongResponse = (next: boolean) => {
    if (next === longResponse) return;

    patchChatDetail({ longResponse: next });
    mutate(
      { chatId, data: { longResponse: next } },
      {
        onError: () => {
          patchChatDetail({ longResponse: chatLongResponse });
          toast.error(TOAST_MESSAGE.CHAT_LONG_RESPONSE_CHANGE_FAILED);
        },
      },
    );
  };

  return {
    models,
    modelCode,
    turnCost,
    select,
    longResponse,
    setLongResponse,
  };
}
