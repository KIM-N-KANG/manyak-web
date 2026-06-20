export type SseEvent =
  | { type: 'started' }
  | { type: 'token'; content: string }
  | { type: 'completed'; aiOutput: string }
  | { type: 'error'; message?: string };

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
    // JSON이 아니면 token content는 raw 문자열로 취급
    return field === 'content' ? trimmed : null;
  }
}

function toSseEvent(eventName: string, dataStr: string): SseEvent | null {
  switch (eventName) {
    case 'started':
      return { type: 'started' };
    case 'token': {
      const content = extractField(dataStr, 'content');

      return content == null ? null : { type: 'token', content };
    }
    case 'completed':
      return {
        type: 'completed',
        aiOutput: extractField(dataStr, 'aiOutput') ?? '',
      };
    case 'error':
      return {
        type: 'error',
        message: extractField(dataStr, 'message') ?? undefined,
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
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
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
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += value.replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');

      while (boundary !== -1) {
        const rawBlock = buffer.slice(0, boundary);

        buffer = buffer.slice(boundary + 2);

        const event = parseEventBlock(rawBlock);

        if (event) yield event;

        boundary = buffer.indexOf('\n\n');
      }
    }

    const trailing = parseEventBlock(buffer);

    if (trailing) yield trailing;
  } finally {
    reader.releaseLock();
  }
}
