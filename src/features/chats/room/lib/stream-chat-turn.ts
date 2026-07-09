import { getStreamChatTurnUrl } from '@/api/generated/endpoints/chats/chats';
import type { ContinueChatRequest } from '@/api/generated/models';
import { notifyIfSessionExpired } from '@/lib/auth/session-expiry';
import { FetchError, resolveApiProxyUrl } from '@/lib/custom-fetch';
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

  // 프록시가 세션 만료(리프레시 확정 거절)를 알리면 능동 로그아웃 신호를 발행한다.
  notifyIfSessionExpired(response.headers);

  if (!response.ok || !response.body) {
    throw new FetchError(
      `스트리밍 요청에 실패했어요 (status: ${response.status})`,
      response.status,
      await response.text().catch(() => null),
    );
  }

  return response.body;
}
