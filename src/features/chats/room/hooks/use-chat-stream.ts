'use client';

import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import type {
  ChatTurnResponse,
  ContinueChatRequestUserSource,
} from '@/api/generated/models';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { isPaymentRequiredError } from '@/features/auth/_shared/utils/guest-limit-error';
import { track } from '@/observability/analytics';
import { trackMetaPixelOnce } from '@/observability/marketing/pixel';

import type { StreamingTurn } from '../types';
import { parseSseStream } from '../utils/parse-sse-stream';
import { isStaleTurnError } from '../utils/regenerate';
import {
  streamChatTurnRaw,
  streamRegenerateChatTurnRaw,
} from '../utils/stream-chat-turn';

/**
 * 채팅 턴 SSE 스트리밍을 관리하는 훅.
 * 토큰 수신에 따라 진행 중인 턴을 갱신하고, 완료 시 `onCompleted`를 호출한다.
 * 언마운트 시 진행 중인 요청을 중단한다.
 *
 * @param chatId 대상 채팅 ID
 * @param turnCount 현재까지의 턴 개수
 * @param onCompleted 스트림 완료 시 호출되는 콜백
 * @param onPaymentRequired 402(체험 한도·크레딧 부족) 발생 시 호출되는 콜백
 * @param onIndeterminate 서버 확정 상태가 불명(EOF·409)일 때 호출되는 콜백
 * @returns 진행 중인 턴·스트리밍 여부와 전송·재생성 동작
 */
export function useChatStream(
  chatId: string,
  turnCount: number,
  onCompleted: () => Promise<unknown> | unknown,
  onPaymentRequired?: (error: unknown) => void,
  onIndeterminate?: () => Promise<unknown> | unknown,
) {
  const [streamingTurn, setStreamingTurn] = useState<StreamingTurn | null>(
    null,
  );
  const [regeneratingTurnId, setRegeneratingTurnId] = useState<number | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (
    userInput: string,
    userSource?: ContinueChatRequestUserSource,
  ) => {
    setStreamingTurn({ userInput, aiOutput: '', baseTurnCount: turnCount });

    const controller = new AbortController();

    abortRef.current = controller;

    let terminalReceived = false;

    try {
      const stream = await streamChatTurnRaw(
        chatId,
        { userInput, userSource },
        controller.signal,
      );

      for await (const event of parseSseStream(stream)) {
        if (event.type === 'token') {
          setStreamingTurn((prev) =>
            prev ? { ...prev, aiOutput: prev.aiOutput + event.content } : prev,
          );
        } else if (event.type === 'completed') {
          terminalReceived = true;

          // 첫 턴의 AI 답변 정상 수신 = Meta 광고 전환 신호(StartTrial, 브라우저당 1회).
          // 스트림이 error 없이 완료된 시점에만 발화한다(캠페인 문서 "26/07" 결정).
          if (turnCount === 0) {
            trackMetaPixelOnce('StartTrial');
          }

          await onCompleted();
          setStreamingTurn(null);
        } else if (event.type === 'error') {
          terminalReceived = true;

          throw new Error(
            event.message ?? TOAST_MESSAGE.RESPONSE_STREAM_FAILED,
          );
        }
      }

      // completed·error 없이 스트림이 끝나면(백엔드 SSE 전체 상한 초과·네트워크 절단) 서버 저장 여부가
      // 불명이다. 처리하지 않으면 스트리밍 상태가 풀리지 않아 화면이 멈춘다(스펙 §3-13 G5). 실패로 확정해
      // 상태를 풀고, 저장됐을 수도 있으므로 임의 복원 대신 refetch로 확정 상태를 가져온다(재생성과 동일).
      // 사용자 취소(방 이탈·언마운트)는 조용히 끝내야 하므로 abort된 스트림은 제외한다.
      if (!terminalReceived && !controller.signal.aborted) {
        setStreamingTurn(null);
        track('client_chat_streamError_shown', {
          chat_id: chatId,
          turn_number: turnCount + 1,
        });
        toast.error(TOAST_MESSAGE.RESPONSE_STREAM_FAILED);

        await onIndeterminate?.();
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      setStreamingTurn(null);

      // 402(체험 한도 초과·크레딧 부족)는 일반 스트림 실패와 다른 UX라 상위에 위임한다.
      // 사유 구분(로그인 유도 vs 실패 토스트)은 세션을 아는 상위에서 code로 판정한다.
      if (onPaymentRequired && isPaymentRequiredError(error)) {
        onPaymentRequired(error);

        return;
      }

      track('client_chat_streamError_shown', {
        chat_id: chatId,
        turn_number: turnCount + 1,
      });
      toast.error(TOAST_MESSAGE.RESPONSE_STREAM_FAILED);
    } finally {
      abortRef.current = null;
    }
  };

  /**
   * 마지막 턴의 AI 응답을 재생성한다(스펙 §3-6 "재생성과 채팅 이미지").
   * 진행 중에는 대상 턴을 스트리밍 블록으로 대체하고, 실패 종류별로 처리한다:
   * - `error` 이벤트: 서버가 교체하지 않았음이 보장됨 → 기존 본문 복원(턴 다시 표시) + 실패 토스트
   * - EOF(completed·error 없이 종료): 교체 여부 불명 → refetch로 서버 확정본 표시
   * - 402: 크레딧/로그인 다이얼로그 위임, 기존 본문 유지
   * - 409(낡은 turnId): refetch로 최신 상태 반영
   */
  const regenerate = async (turn: ChatTurnResponse) => {
    if (turn.id == null) {
      return;
    }

    setRegeneratingTurnId(turn.id);
    setStreamingTurn({ userInput: turn.userInput ?? '', aiOutput: '' });

    const controller = new AbortController();

    abortRef.current = controller;

    let terminalReceived = false;

    try {
      const stream = await streamRegenerateChatTurnRaw(
        chatId,
        { turnId: turn.id },
        controller.signal,
      );

      for await (const event of parseSseStream(stream)) {
        if (event.type === 'token') {
          setStreamingTurn((prev) =>
            prev ? { ...prev, aiOutput: prev.aiOutput + event.content } : prev,
          );
        } else if (event.type === 'completed') {
          terminalReceived = true;
          await onCompleted();
        } else if (event.type === 'error') {
          terminalReceived = true;

          throw new Error(
            event.message ?? TOAST_MESSAGE.RESPONSE_STREAM_FAILED,
          );
        }
      }

      // completed·error 없이 스트림이 끝나면(네트워크 절단·EOF) 서버 교체 여부가 불명이다.
      // 기존 본문을 임의 복원하지 않고 refetch로 확정 상태를 가져온다(스펙 §3-6).
      if (!terminalReceived) {
        await onIndeterminate?.();
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      // 402(체험 한도 초과·크레딧 부족)는 전송과 동일하게 상위에 위임한다.
      if (onPaymentRequired && isPaymentRequiredError(error)) {
        onPaymentRequired(error);

        return;
      }

      // 409: 이미 새 턴이 추가된 낡은 화면 — 복원 대신 최신 상태를 반영한다.
      if (isStaleTurnError(error)) {
        await onIndeterminate?.();

        return;
      }

      // 명시적 error 이벤트 없이 던져진 예외(네트워크 절단 등)는 서버 교체 여부가 불명하다.
      // completed·error 없이 끊긴 EOF와 동일하게 refetch로 확정 상태를 가져온다(스펙 §3-6).
      if (!terminalReceived) {
        await onIndeterminate?.();

        return;
      }

      track('client_chat_streamError_shown', {
        chat_id: chatId,
        turn_number: turnCount,
      });
      toast.error(TOAST_MESSAGE.RESPONSE_STREAM_FAILED);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      // 스트리밍 상태 해제 = 숨겼던 턴이 다시 보임(error 복원) 또는 refetch된 새 본문 표시.
      setStreamingTurn(null);
      setRegeneratingTurnId(null);
    }
  };

  return {
    streamingTurn,
    isStreaming: streamingTurn !== null,
    send,
    regenerate,
    regeneratingTurnId,
  };
}
