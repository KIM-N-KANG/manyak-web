import {
  getRegenerateChatTurnUrl,
  getStreamChatTurnUrl,
} from '@/api/generated/endpoints/chats/chats';
import type {
  ContinueChatRequest,
  RegenerateChatRequest,
} from '@/api/generated/models';
import { notifyIfSessionExpired } from '@/lib/auth/session-expiry';
import {
  FetchError,
  parseErrorResponseBody,
  resolveApiProxyUrl,
} from '@/lib/custom-fetch';
import { getAnalyticsIdentityHeaders } from '@/observability/analytics/identity';

/** 채팅 SSE 엔드포인트에 POST 요청을 보내고 응답 본문 스트림을 반환한다. */
async function postSseStream(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(resolveApiProxyUrl(url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 성공 응답은 SSE지만, 402(크레딧 부족·게스트 한도) 같은 에러는 동기 JSON으로 온다.
      // application/json을 함께 요청해야 서버가 에러 바디(code)를 실어 보낸다(백엔드 KNK-524).
      Accept: 'text/event-stream, application/json',
      ...getAnalyticsIdentityHeaders(),
    },
    body: JSON.stringify(body),
    signal,
  });

  // 프록시가 세션 만료(리프레시 확정 거절)를 알리면 능동 로그아웃 신호를 발행한다.
  notifyIfSessionExpired(response.headers);

  if (!response.ok || !response.body) {
    throw new FetchError(
      `스트리밍 요청에 실패했어요 (status: ${response.status})`,
      response.status,
      await parseErrorResponseBody(response),
    );
  }

  return response.body;
}

/**
 * 채팅 턴 스트리밍 API를 호출해 SSE 응답 본문 스트림을 반환한다.
 * 응답이 실패하거나 본문이 없으면 예외를 던진다.
 */
export function streamChatTurnRaw(
  chatId: string,
  body: ContinueChatRequest,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  return postSseStream(getStreamChatTurnUrl(chatId), body, signal);
}

/**
 * 마지막 턴의 AI 응답 재생성 스트리밍 API를 호출한다.
 * SSE 이벤트 계약은 턴 진행과 동일하다(스펙 §3-6). 낡은 turnId면 서버가 동기 409로 거절한다.
 */
export function streamRegenerateChatTurnRaw(
  chatId: string,
  body: RegenerateChatRequest,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  return postSseStream(getRegenerateChatTurnUrl(chatId), body, signal);
}
