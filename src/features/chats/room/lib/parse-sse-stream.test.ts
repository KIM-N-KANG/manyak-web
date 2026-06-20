import { describe, expect, it } from 'vitest';

import { parseSseStream, type SseEvent } from './parse-sse-stream';

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    },
  });
}

async function collect(
  stream: ReadableStream<Uint8Array>,
): Promise<SseEvent[]> {
  const events: SseEvent[] = [];

  for await (const event of parseSseStream(stream)) {
    events.push(event);
  }

  return events;
}

describe('parseSseStream', () => {
  it('parses started → token → completed in order', async () => {
    const events = await collect(
      streamFrom([
        'event: started\ndata: {}\n\n',
        'event: token\ndata: {"content":"안녕"}\n\n',
        'event: token\ndata: {"content":"하세요"}\n\n',
        'event: completed\ndata: {"aiOutput":"안녕하세요"}\n\n',
      ]),
    );

    expect(events).toEqual([
      { type: 'started' },
      { type: 'token', content: '안녕' },
      { type: 'token', content: '하세요' },
      { type: 'completed', aiOutput: '안녕하세요' },
    ]);
  });

  it('handles chunk boundaries splitting an event in half', async () => {
    const events = await collect(
      streamFrom(['event: tok', 'en\ndata: {"con', 'tent":"x"}\n\n']),
    );

    expect(events).toEqual([{ type: 'token', content: 'x' }]);
  });

  it('parses error events with a message', async () => {
    const events = await collect(
      streamFrom(['event: error\ndata: {"message":"실패"}\n\n']),
    );

    expect(events).toEqual([{ type: 'error', message: '실패' }]);
  });

  it('treats raw (non-JSON) token data as the token content', async () => {
    const events = await collect(streamFrom(['event: token\ndata: 음\n\n']));

    expect(events).toEqual([{ type: 'token', content: '음' }]);
  });

  it('skips unknown events and handles CRLF line endings', async () => {
    const events = await collect(
      streamFrom([
        'event: ping\r\ndata: {}\r\n\r\n',
        'event: token\r\ndata: {"content":"y"}\r\n\r\n',
      ]),
    );

    expect(events).toEqual([{ type: 'token', content: 'y' }]);
  });
});
