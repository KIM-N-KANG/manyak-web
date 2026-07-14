'use client';

import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import type { ChatTurnResponse } from '@/api/generated/models';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { isPaymentRequiredError } from '@/features/auth/login-required/utils/guest-limit-error';
import { track } from '@/observability/analytics';

import { parseSseStream } from '../lib/parse-sse-stream';
import { isStaleTurnError } from '../lib/regenerate';
import {
  streamChatTurnRaw,
  streamRegenerateChatTurnRaw,
} from '../lib/stream-chat-turn';
import type { StreamingTurn } from '../types';

/**
 * 채팅 턴 SSE 스트리밍을 관리하는 훅.
 * 토큰 수신에 따라 진행 중인 턴을 갱신하고, 완료 시 `onCompleted`를 호출한다.
 * 언마운트 시 진행 중인 요청을 중단한다.
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

  const send = async (userInput: string) => {
    setStreamingTurn({ userInput, aiOutput: '' });

    const controller = new AbortController();

    abortRef.current = controller;

    try {
      const stream = await streamChatTurnRaw(
        chatId,
        { userInput },
        controller.signal,
      );

      for await (const event of parseSseStream(stream)) {
        if (event.type === 'token') {
          setStreamingTurn((prev) =>
            prev ? { ...prev, aiOutput: prev.aiOutput + event.content } : prev,
          );
        } else if (event.type === 'completed') {
          await onCompleted();
          setStreamingTurn(null);
        } else if (event.type === 'error') {
          throw new Error(
            event.message ?? TOAST_MESSAGE.RESPONSE_STREAM_FAILED,
          );
        }
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
