import { parseSseStream, type SseEvent } from './parse-sse-stream';

/** 끊긴 생성에 다시 붙는 최대 횟수. 첫 재연결을 포함하며, 간격이 두 배씩 늘어 약 7초 동안 시도한다. */
export const MAX_GENERATION_RECONNECTS = 4;

/** 다시 붙기에 실패한 뒤 다음 시도까지의 첫 간격(ms). 첫 재연결은 기다리지 않고 이후 두 배씩 늘린다. */
export const GENERATION_RECONNECT_DELAY_MS = 1000;

/** 생성을 끝까지 따라간 결과. */
export type GenerationEnd =
  | { type: 'completed' }
  | { type: 'error'; code?: string; message?: string }
  /**
   * 다시 붙어도 종료 이벤트를 받지 못했다. 저장 여부는 상세로 판단한다.
   * `generationId`는 따라가던 생성이다. 같은 생성을 곧바로 다시 따라가지 않는 데 쓴다.
   */
  | { type: 'lost'; generationId: string | null };

/** 생성 도중 화면에 반영할 이벤트. */
export type GenerationProgressEvent = Extract<
  SseEvent,
  { type: 'token' | 'character-image' }
>;

type FollowChatGenerationOptions = {
  /**
   * 처음 연결을 연다. 실패는 그대로 던져 호출부가 402, 409, 503을 나눠 처리한다.
   * 없으면 `generationId`로 재연결부터 시작해 실패도 재연결과 같이 다시 시도한다(재진입).
   */
  open?: () => Promise<ReadableStream<Uint8Array>>;
  /** 같은 생성의 스트림에 다시 붙는다. */
  resume: (generationId: string) => Promise<ReadableStream<Uint8Array>>;
  /** 상세를 다시 조회해 아직 생성 중인 생성 ID를 찾는다. 생성이 끝났으면 null이고, 상세를 받지 못하면 던진다. */
  findGenerationId: () => Promise<string | null>;
  /** 처음 연결부터 생성 ID를 알고 있으면 넘긴다(재진입). */
  generationId?: string;
  /** 다시 붙은 직후 호출한다. 이벤트를 처음부터 다시 받으므로 누적 본문을 비운다. */
  onReconnect: () => void;
  onProgress: (event: GenerationProgressEvent) => void;
  signal: AbortSignal;
};

/**
 * 중단 신호가 오면 바로 끝나는 대기를 만든다.
 *
 * @param ms 기다릴 시간(ms)
 * @param signal 중단 시그널
 * @returns 시간이 지나거나 중단되면 끝나는 Promise
 */
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

/**
 * 채팅 생성 하나를 종료 이벤트까지 따라간다.
 * 서버는 연결이 끊겨도 생성을 계속하므로, 종료 이벤트 없이 닫히면 같은 생성에 다시 붙는다.
 * 아는 생성 ID로 먼저 붙고, 모르거나 다시 붙기에 실패하면 상세에서 생성 중인 ID를 다시 찾는다.
 *
 * @param options 연결, 재연결, 상세 조회 함수와 진행 콜백
 * @returns 종료 이벤트 또는 끝내 받지 못한 결과
 * @throws 처음 연결 실패는 그대로, 중단되면 AbortError를 던진다
 */
export async function followChatGeneration({
  open,
  resume,
  findGenerationId,
  generationId: initialGenerationId,
  onReconnect,
  onProgress,
  signal,
}: FollowChatGenerationOptions): Promise<GenerationEnd> {
  let generationId = initialGenerationId ?? null;
  let followedId = generationId;
  let stream: ReadableStream<Uint8Array> | null = open ? await open() : null;

  const readUntilEnd = async (
    source: ReadableStream<Uint8Array>,
  ): Promise<GenerationEnd | null> => {
    try {
      for await (const event of parseSseStream(source)) {
        if (event.type === 'completed') return { type: 'completed' };

        if (event.type === 'error') {
          return { type: 'error', code: event.code, message: event.message };
        }

        if (event.type === 'started') {
          generationId = event.generationId ?? generationId;
          followedId = generationId ?? followedId;
        } else {
          onProgress(event);
        }
      }
    } catch {
      // 읽는 중 끊긴 것은 종료 이벤트 없이 닫힌 것과 같다. 중단 여부는 아래에서 signal로 가린다.
    }

    return null;
  };

  for (let attempt = 0; ; attempt += 1) {
    const end = stream ? await readUntilEnd(stream) : null;

    if (end) return end;

    signal.throwIfAborted();

    if (attempt >= MAX_GENERATION_RECONNECTS) {
      return { type: 'lost', generationId: followedId };
    }

    if (attempt > 0) {
      await wait(GENERATION_RECONNECT_DELAY_MS * 2 ** (attempt - 1), signal);
      signal.throwIfAborted();
    }

    stream = null;

    try {
      const targetId = generationId ?? (await findGenerationId());

      generationId = null;

      if (!targetId) return { type: 'lost', generationId: followedId };

      followedId = targetId;
      stream = await resume(targetId);
      onReconnect();
    } catch {
      signal.throwIfAborted();
      // 상세를 받지 못했거나 재연결이 404(스트림 없음), 503(수신 불가), 네트워크 실패면
      // 다음 차례에 상세에서 다시 찾는다.
    }
  }
}
