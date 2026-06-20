'use client';

import { useEffect, useRef, useState } from 'react';

import type { StreamingTurn } from '../components/chat-messages';
import { parseSseStream } from '../lib/parse-sse-stream';
import { streamChatTurnRaw } from '../lib/stream-chat-turn';

const STREAM_ERROR_MESSAGE =
  '응답 생성에 실패했어요. 잠시 후 다시 시도해주세요.';

export function useChatStream(
  chatId: string,
  onCompleted: () => Promise<unknown> | unknown,
) {
  const [streamingTurn, setStreamingTurn] = useState<StreamingTurn | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (userInput: string) => {
    setError(null);

    setStreamingTurn({ userInput, output: '' });

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
            prev ? { ...prev, output: prev.output + event.content } : prev,
          );
        } else if (event.type === 'completed') {
          await onCompleted();
          setStreamingTurn(null);
        } else if (event.type === 'error') {
          throw new Error(event.message ?? STREAM_ERROR_MESSAGE);
        }
      }
    } catch (caught) {
      if (controller.signal.aborted) {
        return;
      }

      setError(caught instanceof Error ? caught.message : STREAM_ERROR_MESSAGE);
      setStreamingTurn(null);
    } finally {
      abortRef.current = null;
    }
  };

  return {
    streamingTurn,
    isStreaming: streamingTurn !== null,
    error,
    send,
    clearError: () => setError(null),
  };
}
