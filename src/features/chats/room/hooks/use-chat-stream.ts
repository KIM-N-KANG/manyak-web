'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { toast } from 'sonner';

import type {
  ChatDetailResponse,
  ChatTurnResponse,
  ContinueChatRequestUserSource,
  GeneratingTurnResponse,
} from '@/api/generated/models';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { isPaymentRequiredError } from '@/features/auth/_shared/utils/guest-limit-error';
import {
  appendChatCharacterImageSegment,
  appendChatTextSegment,
} from '@/features/chats/_shared/utils/chat-message-segments';
import { track } from '@/observability/analytics';
import { trackMetaPixelOnce } from '@/observability/marketing/pixel';

import type { ChatChoiceSelection, StreamingTurn } from '../types';
import {
  followChatGeneration,
  type GenerationEnd,
  type GenerationProgressEvent,
} from '../utils/follow-chat-generation';
import { isStaleTurnError } from '../utils/regenerate';
import {
  resumeChatGenerationRaw,
  streamChatTurnRaw,
  streamRegenerateChatTurnRaw,
} from '../utils/stream-chat-turn';

/** 생성 종류. 전송은 새 턴을 더하고, 재생성은 마지막 턴을 교체한다. */
type GenerationKind = 'send' | 'regenerate';

type FollowParams = {
  kind: GenerationKind;
  /** 생성을 시작한 시점의 확정 턴 개수. 끊긴 뒤 새 턴이 저장됐는지 가리는 기준이다. */
  baseTurnCount: number;
  /** 처음 연결. 없으면 `generationId`로 재연결부터 시작한다(재진입). */
  open?: (signal: AbortSignal) => Promise<ReadableStream<Uint8Array>>;
  generationId?: string;
  /** 서버가 받지 않았을 때(409) 입력창에 되돌릴 입력. 전송에만 있다. */
  unsentInput?: string;
};

type UseChatStreamParams = {
  chatId: string;
  /** 현재 확정 턴 목록. 개수와 마지막 턴 ID를 요청과 판정에 쓴다. */
  turns: ChatTurnResponse[];
  /** 상세의 생성 중인 턴. 있으면 화면에 들어오자마자 그 생성을 이어서 받는다. */
  generatingTurn: GeneratingTurnResponse | null;
  /** 스트림 완료 시 호출되는 콜백. 턴 전송(`send`)과 응답 재생성(`regenerate`)을 구분해 받는다 */
  onCompleted: (source: GenerationKind) => Promise<unknown> | unknown;
  /** 402(체험 한도, 이프 부족) 발생 시 호출되는 콜백 */
  onPaymentRequired?: (error: unknown) => void;
  /** 상세를 다시 조회해 새 응답을 돌려준다. 결과가 불명이거나 거절됐을 때 확정 상태를 확인한다 */
  reload: () => Promise<ChatDetailResponse | undefined>;
  /** 서버가 받지 않은 입력(409)을 입력창에 되돌린다 */
  onUnsent?: (userInput: string) => void;
  /** 실시간 이미지 생성 여부. 전송과 재생성 요청 본문에 그대로 싣는다 */
  realtimeImage?: boolean;
};

/**
 * 채팅 턴 SSE 스트리밍을 관리하는 훅.
 * 토큰 수신에 따라 진행 중인 턴을 갱신하고, 완료 시 `onCompleted`를 호출한다.
 * 서버는 연결이 끊겨도 생성을 계속하므로, 끊기면 같은 생성에 다시 붙고 상세의 생성 중인 턴도 이어서 받는다.
 * 언마운트 시 진행 중인 수신만 중단한다.
 *
 * @param params 채팅 ID, 확정 턴과 생성 중인 턴, 완료와 실패 콜백, 상세 재조회 함수, 실시간 이미지 여부
 * @returns 진행 중인 턴, 스트리밍 여부와 전송, 재생성 동작
 */
export function useChatStream({
  chatId,
  turns,
  generatingTurn,
  onCompleted,
  onPaymentRequired,
  reload,
  onUnsent,
  realtimeImage = true,
}: UseChatStreamParams) {
  const [streamingTurn, setStreamingTurn] = useState<StreamingTurn | null>(
    null,
  );
  const [regeneratingTurnId, setRegeneratingTurnId] = useState<number | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const appendProgress = (event: GenerationProgressEvent) => {
    setStreamingTurn((prev) =>
      prev
        ? {
            ...prev,
            segments:
              event.type === 'token'
                ? appendChatTextSegment(prev.segments, event.content)
                : appendChatCharacterImageSegment(prev.segments, {
                    name: event.name,
                    imageUrl: event.imageUrl,
                  }),
          }
        : prev,
    );
  };

  const showFailure = (baseTurnCount: number) => {
    track('client_chat_streamError_shown', {
      chat_id: chatId,
      turn_number: baseTurnCount + 1,
    });
    toast.error(TOAST_MESSAGE.RESPONSE_STREAM_FAILED);
  };

  /**
   * 종료 결과에 맞춰 화면을 확정한다.
   * - `completed`: 상세 재조회로 확정 턴을 받는다
   * - `error`: 저장된 턴이 있을 수 있어 상세를 확인한 뒤 실패 토스트를 띄운다(재생성은 기존 본문 복원)
   * - `lost`: 상세로 판단한다. 다른 생성이 진행 중이면 그 생성을 이어받고, 전송은 새 턴이 있으면 완료,
   *   없으면 실패다. 따라가던 생성이 아직 진행 중이어도 곧바로 다시 따라가지 않는다(재진입이나 409로 이어받음).
   *   재생성은 상세만으로 성공과 실패를 가리지 못해 확정 상태만 보인다
   */
  const settle = async (
    kind: GenerationKind,
    end: GenerationEnd,
    baseTurnCount: number,
  ) => {
    if (end.type === 'completed') {
      // 첫 턴의 AI 답변 정상 수신 = Meta 광고 전환 신호(StartTrial, 브라우저당 1회).
      // 스트림이 error 없이 완료된 시점에만 발화한다(캠페인 문서 "26/07" 결정).
      if (kind === 'send' && baseTurnCount === 0) {
        trackMetaPixelOnce('StartTrial');
      }

      await onCompleted(kind);

      return;
    }

    const detail = await reload();

    if (end.type === 'error') {
      showFailure(kind === 'send' ? baseTurnCount : baseTurnCount - 1);

      return;
    }

    const next = detail?.generatingTurn;

    if (next?.generationId && next.generationId !== end.generationId) {
      void resume(next, detail?.turns?.length ?? 0);

      return;
    }

    if (kind === 'regenerate') return;

    if (detail && (detail.turns?.length ?? 0) > baseTurnCount) {
      await onCompleted('send');

      return;
    }

    showFailure(baseTurnCount);
  };

  const follow = async ({
    kind,
    baseTurnCount,
    open,
    generationId,
    unsentInput,
  }: FollowParams) => {
    const controller = new AbortController();
    const { signal } = controller;

    abortRef.current = controller;

    try {
      const end = await followChatGeneration({
        open: open && (() => open(signal)),
        generationId,
        resume: (targetId) => resumeChatGenerationRaw(chatId, targetId, signal),
        findGenerationId: async () => {
          const detail = await reload();

          if (!detail) throw new Error('채팅 상세를 다시 받지 못했다');

          return detail.generatingTurn?.generationId ?? null;
        },
        onReconnect: () =>
          setStreamingTurn((prev) => (prev ? { ...prev, segments: [] } : prev)),
        onProgress: appendProgress,
        signal,
      });

      await settle(kind, end, baseTurnCount);
    } catch (error) {
      // 방 이탈(언마운트)은 수신만 멈춘 것이다. 서버는 생성을 계속하고 다시 들어오면 이어받는다.
      if (signal.aborted) return;

      // 402(체험 한도 초과, 이프 부족)는 일반 스트림 실패와 다른 UX라 상위에 위임한다.
      // 사유 구분(로그인 유도 vs 실패 토스트)은 세션을 아는 상위에서 code로 판정한다.
      if (onPaymentRequired && isPaymentRequiredError(error)) {
        onPaymentRequired(error);

        return;
      }

      // 409는 서버가 받지 않은 요청이다. 다른 곳에서 생성 중이면 그 생성을 이어받고(CHAT_TURN_IN_PROGRESS),
      // 마지막 턴이 바뀌었으면(CHAT_TURN_STALE) 새로 받은 상세로 충분하다. 보낸 입력은 입력창에 되돌린다.
      const conflicted = isStaleTurnError(error);

      if (conflicted && unsentInput !== undefined) {
        onUnsent?.(unsentInput);
      }

      // 연결 실패는 요청이 서버에 닿았을 수 있어 생성 중인지 확인한다.
      const detail = await reload();

      if (detail?.generatingTurn) {
        void resume(detail.generatingTurn, detail.turns?.length ?? 0);

        return;
      }

      if (!conflicted) {
        showFailure(kind === 'send' ? baseTurnCount : baseTurnCount - 1);
      }
    } finally {
      // 이어받기가 새 수신을 시작했으면 그쪽이 스트리밍 상태를 가진다.
      if (abortRef.current === controller) {
        abortRef.current = null;
        // 스트리밍 상태 해제 = 숨겼던 턴이 다시 보임(error 복원) 또는 재조회된 새 본문 표시.
        setStreamingTurn(null);
        setRegeneratingTurnId(null);
      }
    }
  };

  const send = (
    userInput: string,
    userSource?: ContinueChatRequestUserSource,
    selection?: ChatChoiceSelection,
  ) => {
    const baseTurnCount = turns.length;

    setStreamingTurn({
      userInput,
      segments: [],
      baseTurnCount,
      realtimeImage,
    });

    return follow({
      kind: 'send',
      baseTurnCount,
      unsentInput: userInput,
      open: (signal) =>
        streamChatTurnRaw(
          chatId,
          {
            userInput,
            userSource,
            realtimeImage,
            lastTurnId: turns.at(-1)?.id ?? null,
            ...selection,
          },
          signal,
        ),
    });
  };

  /**
   * 마지막 턴의 AI 응답을 재생성한다(스펙 §3-6 "재생성과 채팅 이미지").
   * 진행 중에는 대상 턴을 스트리밍 블록으로 대체하고, 실패 종류별 처리는 `settle`을 따른다.
   */
  const regenerate = (turn: ChatTurnResponse) => {
    if (turn.id == null) {
      return;
    }

    const turnId = turn.id;

    setRegeneratingTurnId(turnId);
    setStreamingTurn({
      userInput: turn.userInput ?? '',
      segments: [],
      realtimeImage,
    });

    return follow({
      kind: 'regenerate',
      baseTurnCount: turns.length,
      open: (signal) =>
        streamRegenerateChatTurnRaw(chatId, { turnId, realtimeImage }, signal),
    });
  };

  /**
   * 다른 화면이나 기기에서 시작한 생성을 이어받는다. 이벤트를 처음부터 다시 받아 생성 중 화면을 그린다.
   *
   * @param target 상세의 생성 중인 턴
   * @param baseTurnCount 그 상세의 확정 턴 개수
   */
  const resume = (target: GeneratingTurnResponse, baseTurnCount: number) => {
    const { generationId } = target;

    if (!generationId) return;

    const targetTurnId =
      target.type === 'REGENERATE' ? (target.targetTurnId ?? null) : null;

    setRegeneratingTurnId(targetTurnId);
    setStreamingTurn({
      userInput: target.userInput ?? '',
      segments: [],
      baseTurnCount: targetTurnId == null ? baseTurnCount : undefined,
      realtimeImage,
    });

    return follow({
      kind: targetTurnId == null ? 'send' : 'regenerate',
      baseTurnCount,
      generationId,
    });
  };

  const resumeOnEntry = useEffectEvent(() => {
    // 이미 따라가는 생성이 있으면(직접 보낸 생성 등) 겹쳐 붙지 않는다. 중단된 수신은 정리 전이라도 끝난 것으로 본다.
    if (
      generatingTurn &&
      (!abortRef.current || abortRef.current.signal.aborted)
    ) {
      void resume(generatingTurn, turns.length);
    }
  });

  const generatingId = generatingTurn?.generationId;

  useEffect(() => {
    if (generatingId) resumeOnEntry();
  }, [generatingId]);

  return {
    streamingTurn,
    isStreaming: streamingTurn !== null,
    send,
    regenerate,
    regeneratingTurnId,
  };
}
