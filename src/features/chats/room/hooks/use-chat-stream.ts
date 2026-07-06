'use client';

import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import { parseSseStream } from '../lib/parse-sse-stream';
import { streamChatTurnRaw } from '../lib/stream-chat-turn';
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
) {
  const [streamingTurn, setStreamingTurn] = useState<StreamingTurn | null>(
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
    } catch {
      if (controller.signal.aborted) {
        return;
      }

      track('client_chat_streamError_shown', {
        chat_id: chatId,
        turn_number: turnCount + 1,
      });
      toast.error(TOAST_MESSAGE.RESPONSE_STREAM_FAILED);
      setStreamingTurn(null);
    } finally {
      abortRef.current = null;
    }
  };

  return {
    streamingTurn,
    isStreaming: streamingTurn !== null,
    send,
  };
}
