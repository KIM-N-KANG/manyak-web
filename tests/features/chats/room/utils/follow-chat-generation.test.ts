import { describe, expect, it, vi } from 'vitest';

import {
  followChatGeneration,
  MAX_GENERATION_RECONNECTS,
} from '@/features/chats/room/utils/follow-chat-generation';
import { FetchError } from '@/lib/api-error';

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

const STARTED =
  'event: started\ndata: {"chatId":"c1","generationId":"g-1"}\n\n';
const TOKEN = 'event: token\ndata: {"text":"문이 "}\n\n';
const COMPLETED = 'event: completed\ndata: {"aiOutput":"문이 열린다."}\n\n';

function setup(overrides: {
  /** null이면 처음 연결 없이 재연결부터 시작한다(재진입). */
  open?: (() => Promise<ReadableStream<Uint8Array>>) | null;
  resume?: (generationId: string) => Promise<ReadableStream<Uint8Array>>;
  findGenerationId?: () => Promise<string | null>;
  generationId?: string;
}) {
  const controller = new AbortController();
  const progress: string[] = [];
  const onReconnect = vi.fn(() => progress.push('reset'));
  const resume = vi.fn(
    overrides.resume ?? (async () => streamFrom([STARTED, COMPLETED])),
  );
  const findGenerationId = vi.fn(
    overrides.findGenerationId ?? (async () => null),
  );

  const run = () =>
    followChatGeneration({
      open:
        overrides.open === null
          ? undefined
          : (overrides.open ?? (async () => streamFrom([STARTED, COMPLETED]))),
      resume,
      findGenerationId,
      generationId: overrides.generationId,
      onReconnect,
      onProgress: (event) =>
        progress.push(event.type === 'token' ? event.content : event.name),
      signal: controller.signal,
    });

  return { controller, progress, onReconnect, resume, findGenerationId, run };
}

describe('followChatGeneration', () => {
  it('종료 이벤트를 받으면 그 결과로 끝난다', async () => {
    const { run, progress, resume } = setup({
      open: async () => streamFrom([STARTED, TOKEN, COMPLETED]),
    });

    await expect(run()).resolves.toEqual({ type: 'completed' });
    expect(progress).toEqual(['문이 ']);
    expect(resume).not.toHaveBeenCalled();
  });

  it('error 이벤트는 code와 함께 돌려준다', async () => {
    const { run } = setup({
      open: async () =>
        streamFrom([
          STARTED,
          'event: error\ndata: {"code":"AI_STREAM_FAILED","message":"실패"}\n\n',
        ]),
    });

    await expect(run()).resolves.toEqual({
      type: 'error',
      code: 'AI_STREAM_FAILED',
      message: '실패',
    });
  });

  it('종료 이벤트 없이 닫히면 started의 생성 ID로 바로 다시 붙고 누적 본문을 비운다', async () => {
    const { run, progress, resume, findGenerationId } = setup({
      open: async () => streamFrom([STARTED, TOKEN]),
      resume: async () => streamFrom([STARTED, TOKEN, COMPLETED]),
    });

    await expect(run()).resolves.toEqual({ type: 'completed' });
    expect(resume).toHaveBeenCalledWith('g-1');
    expect(findGenerationId).not.toHaveBeenCalled();
    expect(progress).toEqual(['문이 ', 'reset', '문이 ']);
  });

  it('생성 ID를 모르면 상세에서 찾아 붙는다', async () => {
    const { run, resume } = setup({
      open: async () => streamFrom(['event: started\ndata: {}\n\n', TOKEN]),
      findGenerationId: async () => 'g-2',
    });

    await expect(run()).resolves.toEqual({ type: 'completed' });
    expect(resume).toHaveBeenCalledWith('g-2');
  });

  it('상세에 생성 중인 턴이 없으면 lost로 끝낸다', async () => {
    const { run, resume } = setup({
      open: async () => streamFrom(['event: started\ndata: {}\n\n']),
    });

    await expect(run()).resolves.toEqual({ type: 'lost', generationId: null });
    expect(resume).not.toHaveBeenCalled();
  });

  it('재연결이 404면 상세에서 다시 찾아 붙는다', async () => {
    vi.useFakeTimers();

    const { run, resume, findGenerationId } = setup({
      open: async () => streamFrom([STARTED]),
      resume: vi
        .fn()
        .mockRejectedValueOnce(new FetchError('not found', 404, null))
        .mockResolvedValueOnce(streamFrom([STARTED, COMPLETED])),
      findGenerationId: async () => 'g-1',
    });

    const result = run();

    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual({ type: 'completed' });
    expect(resume).toHaveBeenCalledTimes(2);
    expect(findGenerationId).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it(`${MAX_GENERATION_RECONNECTS}번 다시 붙어도 끝나지 않으면 lost로 끝낸다`, async () => {
    vi.useFakeTimers();

    const { run, resume } = setup({
      open: async () => streamFrom([STARTED]),
      resume: async () => streamFrom([STARTED]),
    });

    const result = run();

    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual({
      type: 'lost',
      generationId: 'g-1',
    });
    expect(resume).toHaveBeenCalledTimes(MAX_GENERATION_RECONNECTS);

    vi.useRealTimers();
  });

  it('재진입은 넘겨받은 생성 ID로 다시 붙는다', async () => {
    const { run, resume } = setup({
      open: null,
      generationId: 'g-9',
    });

    await expect(run()).resolves.toEqual({ type: 'completed' });
    expect(resume).toHaveBeenCalledWith('g-9');
  });

  it('재진입의 재연결이 실패해도 간격을 두고 상세에서 다시 찾아 붙는다', async () => {
    vi.useFakeTimers();

    const { run, resume } = setup({
      open: null,
      generationId: 'g-9',
      resume: vi
        .fn()
        .mockRejectedValueOnce(new FetchError('unavailable', 503, null))
        .mockResolvedValueOnce(streamFrom([STARTED, COMPLETED])),
      findGenerationId: async () => 'g-9',
    });

    const result = run();

    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual({ type: 'completed' });
    expect(resume).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('상세를 받지 못하면 생성이 끝난 것으로 보지 않고 다음 차례에 다시 찾는다', async () => {
    vi.useFakeTimers();

    const { run, resume } = setup({
      open: async () => streamFrom(['event: started\ndata: {}\n\n']),
      findGenerationId: vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce('g-2'),
    });

    const result = run();

    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual({ type: 'completed' });
    expect(resume).toHaveBeenCalledWith('g-2');

    vi.useRealTimers();
  });

  it('처음 연결 실패는 그대로 던진다', async () => {
    const conflict = new FetchError('conflict', 409, {
      code: 'CHAT_TURN_IN_PROGRESS',
    });
    const { run, resume } = setup({
      open: async () => {
        throw conflict;
      },
    });

    await expect(run()).rejects.toBe(conflict);
    expect(resume).not.toHaveBeenCalled();
  });

  it('중단되면 다시 붙지 않고 AbortError를 던진다', async () => {
    const { run, controller, resume } = setup({
      open: async () => {
        controller.abort();

        return streamFrom([STARTED]);
      },
    });

    await expect(run()).rejects.toMatchObject({ name: 'AbortError' });
    expect(resume).not.toHaveBeenCalled();
  });
});
