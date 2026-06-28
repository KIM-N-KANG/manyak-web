export type SseEvent =
  | { type: 'started' }
  | { type: 'token'; content: string }
  | { type: 'completed'; aiOutput: string }
  | { type: 'error'; message?: string };

const SSE_EVENT_PREFIX = 'event:';
const SSE_DATA_PREFIX = 'data:';

const SSE_FIELD = {
  TEXT: 'text',
  AI_OUTPUT: 'aiOutput',
  MESSAGE: 'message',
} as const;

const normalizeNewlines = (text: string): string => text.replace(/\r\n/g, '\n');

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

function toSseEvent(eventName: string, dataStr: string): SseEvent | null {
  switch (eventName) {
    case 'started':
      return { type: 'started' };
    case 'token': {
      const content = extractField(dataStr, SSE_FIELD.TEXT);

      return content == null ? null : { type: 'token', content };
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
