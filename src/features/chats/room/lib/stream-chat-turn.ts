import { getStreamChatTurnUrl } from '@/api/generated/endpoints/chats/chats';
import type { ContinueChatRequest } from '@/api/generated/models';
import { resolveApiProxyUrl } from '@/lib/custom-fetch';
import { getAnalyticsIdentityHeaders } from '@/observability/analytics/identity';

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
