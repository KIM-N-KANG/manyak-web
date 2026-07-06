import { getStreamChatTurnUrl } from '@/api/generated/endpoints/chats/chats';
import type { ContinueChatRequest } from '@/api/generated/models';
import { resolveApiProxyUrl } from '@/lib/custom-fetch';
import { getAnalyticsIdentityHeaders } from '@/observability/analytics/identity';

/**
 * 채팅 턴 스트리밍 API를 호출해 SSE 응답 본문 스트림을 반환한다.
 * 응답이 실패하거나 본문이 없으면 예외를 던진다.
 */
export async function streamChatTurnRaw(
  chatId: string,
  body: ContinueChatRequest,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(
    resolveApiProxyUrl(getStreamChatTurnUrl(chatId)),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...getAnalyticsIdentityHeaders(),
      },
      body: JSON.stringify(body),
      signal,
    },
  );

  if (!response.ok || !response.body) {
    throw new Error(`스트리밍 요청에 실패했어요 (status: ${response.status})`);
  }

  return response.body;
}
