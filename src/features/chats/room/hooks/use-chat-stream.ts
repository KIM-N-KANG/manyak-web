'use client';

import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { TOAST_MESSAGE } from '@/constants/toast-message';

import type { StreamingTurn } from '../components/chat-messages';
import { parseSseStream } from '../lib/parse-sse-stream';
import { streamChatTurnRaw } from '../lib/stream-chat-turn';

export function useChatStream(
  chatId: string,
  onCompleted: () => Promise<unknown> | unknown,
) {
  const [streamingTurn, setStreamingTurn] = useState<StreamingTurn | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async (userInput: string) => {
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
          throw new Error(
            event.message ?? TOAST_MESSAGE.RESPONSE_STREAM_FAILED,
          );
        }
      }
    } catch (caught) {
      if (controller.signal.aborted) {
        return;
      }

      toast.error(
        caught instanceof Error
          ? caught.message
          : TOAST_MESSAGE.RESPONSE_STREAM_FAILED,
      );
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
