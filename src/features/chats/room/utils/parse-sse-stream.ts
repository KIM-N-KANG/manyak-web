/** 채팅 턴 스트리밍에서 발생하는 SSE 이벤트 */
export type SseEvent =
  | { type: 'started' }
  | { type: 'token'; content: string }
  | { type: 'character-image'; name: string; imageUrl: string }
  | { type: 'completed'; aiOutput: string }
  | { type: 'error'; message?: string };

const SSE_EVENT_PREFIX = 'event:';
const SSE_DATA_PREFIX = 'data:';

const SSE_FIELD = {
  TEXT: 'text',
  NAME: 'name',
  IMAGE_URL: 'imageUrl',
  AI_OUTPUT: 'aiOutput',
  MESSAGE: 'message',
} as const;

/**
 * 문자열의 CRLF 줄바꿈을 LF로 통일한다.
 *
 * @param text 정규화할 문자열
 * @returns CRLF가 LF로 치환된 문자열
 */
const normalizeNewlines = (text: string): string => text.replace(/\r\n/g, '\n');

/**
 * SSE data 문자열(JSON 또는 평문)에서 지정한 필드 값을 추출한다.
 *
 * @param dataStr SSE data 필드 원문
 * @param field 추출할 필드 이름
 * @returns 추출한 필드 값. 없으면 null(단, TEXT 필드는 JSON 파싱 실패 시 평문 반환)
 */
function extractField(dataStr: string, field: string): string | null {
  const trimmed = dataStr.trim();

  try {
    const parsed: unknown = JSON.parse(trimmed);

    if (parsed && typeof parsed === 'object' && field in parsed) {
      const value = (parsed as Record<string, unknown>)[field];

      return value == null ? null : String(value);
    }

    return null;
  } catch {
    return field === SSE_FIELD.TEXT ? trimmed : null;
  }
}

/**
 * SSE 이벤트 이름과 data 문자열을 내부 `SseEvent` 객체로 변환한다.
 *
 * @param eventName SSE 이벤트 이름
 * @param dataStr SSE data 필드 원문
 * @returns 변환된 이벤트. 알 수 없는 이벤트거나 필수 필드가 없으면 null
 */
function toSseEvent(eventName: string, dataStr: string): SseEvent | null {
  switch (eventName) {
    case 'started':
      return { type: 'started' };
    case 'token': {
      const content = extractField(dataStr, SSE_FIELD.TEXT);

      return content == null ? null : { type: 'token', content };
    }
    case 'character_image': {
      const name = extractField(dataStr, SSE_FIELD.NAME);
      const imageUrl = extractField(dataStr, SSE_FIELD.IMAGE_URL);

      return name && imageUrl
        ? { type: 'character-image', name, imageUrl }
        : null;
    }
    case 'completed':
      return {
        type: 'completed',
        aiOutput: extractField(dataStr, SSE_FIELD.AI_OUTPUT) ?? '',
      };
    case 'error':
      return {
        type: 'error',
        message: extractField(dataStr, SSE_FIELD.MESSAGE) ?? undefined,
      };

    default:
      return null;
  }
}

/**
 * 하나의 SSE 이벤트 블록(event·data 줄 묶음)을 파싱해 이벤트로 변환한다.
 *
 * @param block 빈 줄로 구분된 하나의 SSE 이벤트 블록
 * @returns 파싱된 이벤트. 데이터가 없거나 변환 불가면 null
 */
function parseEventBlock(block: string): SseEvent | null {
  const lines = block.split('\n');
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(SSE_EVENT_PREFIX)) {
      eventName = line.slice(SSE_EVENT_PREFIX.length).trim();
    } else if (line.startsWith(SSE_DATA_PREFIX)) {
      dataLines.push(line.slice(SSE_DATA_PREFIX.length).trim());
    }
  }

  if (dataLines.length === 0 && eventName === 'message') {
    return null;
  }

  return toSseEvent(eventName, dataLines.join('\n'));
}

/**
 * SSE 바이트 스트림을 이벤트 단위로 파싱해 순차적으로 내보낸다.
 * 빈 줄(\n\n)을 이벤트 경계로 사용하며, 스트림 종료 시 남은 버퍼도 처리한다.
 *
 * @param stream 파싱할 SSE 바이트 스트림
 * @returns 파싱된 SSE 이벤트를 순차적으로 내보내는 async generator
 */
export async function* parseSseStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = normalizeNewlines(buffer);

      let boundary = buffer.indexOf('\n\n');

      while (boundary !== -1) {
        const rawBlock = buffer.slice(0, boundary);

        buffer = buffer.slice(boundary + 2);

        const event = parseEventBlock(rawBlock);

        if (event) yield event;

        boundary = buffer.indexOf('\n\n');
      }
    }

    buffer += decoder.decode();
    buffer = normalizeNewlines(buffer);

    const trailing = parseEventBlock(buffer);

    if (trailing) yield trailing;
  } finally {
    reader.releaseLock();
  }
}
