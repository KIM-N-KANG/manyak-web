/**
 * @file 오버레이와 퍼널 가드가 쌓는 더미 히스토리 칸의 상태 머신.
 * 브라우저 의존은 `HistoryAdapter`로 분리해 단위 테스트가 가짜를 넣을 수 있게 한다.
 * 문서 단위 인스턴스 생성과 popstate 연결은 `history-layers.ts`가 맡는다.
 */

/**
 * 레이어 종류. `close`는 뒤로가기 한 번에 닫히는 오버레이용이고, `guard`는 소비될 때마다
 * 더미를 다시 쌓아 화면 이탈을 막는 퍼널 가드용이다.
 */
export type HistoryLayerKind = 'close' | 'guard';

export type HistoryLayer = {
  id: string;
  /** `close`는 뒤로가기 한 번에 소비되고, `guard`는 소비될 때마다 더미를 다시 쌓는다. */
  kind: HistoryLayerKind;
  onBack: () => void;
};

/** 브라우저 히스토리와 활성화 상태에 닿는 부분. 테스트는 가짜를 넣는다. */
export type HistoryAdapter = {
  /** 같은 주소로 더미 칸을 한 개 쌓는다. */
  pushEntry: () => void;
  go: (delta: number) => void;
  href: () => string;
  isUserActive: () => boolean;
  /** 다음 사용자 입력 한 번에 callback을 부른다. 해제 함수를 돌려준다. */
  onceUserInput: (callback: () => void) => () => void;
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

/** 되감기 뒤 popstate를 기다리는 상한. 넘기면 끊긴 것으로 보고 큐를 비운다. */
export const TRAVERSAL_TIMEOUT_MS = 1000;

/**
 * 오버레이와 퍼널 가드가 쌓는 더미 히스토리 칸을 한곳에서 관리하는 상태 머신이다.
 *
 * - `layers`는 연 순서(아래 → 위), `entries`는 더미 칸의 주인 id(아래 → 위)다. 주인이 없는 칸(`null`)은
 *   중간 레이어가 먼저 닫혀 남은 잔여다.
 * - 더미 쌓기와 되감기는 큐로 직렬화한다. 되감기는 popstate가 돌아올 때까지 다음 작업을 막는다.
 * - popstate는 맨 위 더미의 주인에게만 간다. 더미가 없으면 관여하지 않는다.
 */
export class HistoryLayerStack {
  private layers: HistoryLayer[] = [];
  private entries: (string | null)[] = [];
  private href: string | null = null;
  private queue: (() => void)[] = [];
  private pendingTraversal = false;
  private timeoutHandle: unknown = null;
  private cancelInputWatch: (() => void) | null = null;

  constructor(private readonly adapter: HistoryAdapter) {}

  /**
   * 레이어를 맨 위에 등록하고 더미 칸을 쌓는다.
   *
   * @remarks
   * 사용자 활성화 없이 쌓은 칸은 Chrome이 뒤로가기에서 건너뛰므로 이때는 칸을 쌓지 않는다.
   * `close` 레이어는 칸 없이 등록만 되어 뒤로가기를 받지 않고, `guard` 레이어는 다음 사용자 입력에서
   * `rearm`으로 칸을 쌓는다.
   * 입력 대기는 하나만 두므로 나중에 연 가드가 앞선 대기를 대체한다.
   *
   * @param layer 등록할 레이어. id는 스택 안에서 유일해야 한다.
   */
  open(layer: HistoryLayer): void {
    this.layers.push(layer);

    if (this.adapter.isUserActive()) {
      this.enqueue(() => this.pushEntry(layer.id));

      return;
    }

    // 조작 없이 쌓은 칸은 Chrome이 뒤로가기에서 건너뛰므로 쌓지 않는다. 가드만 첫 입력에서 쌓는다.
    if (layer.kind === 'guard') {
      this.cancelInputWatch?.();
      this.cancelInputWatch = this.adapter.onceUserInput(() => {
        this.cancelInputWatch = null;
        this.rearm(layer.id);
      });
    }
  }

  /**
   * 레이어를 지운다. 그 레이어의 칸은 주인 없는 칸으로 바꾸고, 맨 위부터 이어지는 주인 없는
   * 칸만 되감는다. 중간 레이어의 칸은 위 레이어가 닫힐 때까지 잔여로 남는다.
   */
  close(id: string): void {
    const index = this.layers.findIndex((layer) => layer.id === id);

    if (index === -1) return;

    this.layers.splice(index, 1);

    const entryIndex = this.entries.lastIndexOf(id);

    if (entryIndex === -1) return;

    this.entries[entryIndex] = null;
    this.consumeTrailingOrphans();
  }

  /**
   * 칸이 없는 레이어에 더미 칸을 다시 쌓는다. 레이어가 없거나 이미 칸이 있으면 무시한다.
   * 소비자가 뒤로가기 닫기를 거부했을 때와 가드가 첫 사용자 입력을 받았을 때 쓴다.
   */
  rearm(id: string): void {
    const layer = this.layers.find((candidate) => candidate.id === id);

    if (!layer || this.entries.includes(id)) return;

    this.enqueue(() => this.pushEntry(id));
  }

  hasEntry(id: string): boolean {
    return this.entries.includes(id);
  }

  /** 지금 쌓여 있는 더미 칸 수를 돌려준다. */
  entryCount(): number {
    return this.entries.length;
  }

  /**
   * 캡처 단계 popstate를 처리한다.
   *
   * @remarks
   * - 스택이 건 되감기를 기다리던 중이면 그 popstate를 흡수하고 멈춘 큐를 이어 돌린다.
   * - 더미가 없으면 관여하지 않는다. 주소가 더미를 쌓을 때와 다르면 히스토리가 바깥에서
   *   바뀐 것으로 보고 상태를 모두 버린다.
   * - 그 밖에는 맨 위 칸을 꺼내 주인의 `onBack`을 부른다. `guard`는 칸을 다시 쌓고, `close`는
   *   소비자가 닫기를 거부할 수 있도록 layers에 남겨 둔다.
   *
   * @returns `consumed`가 true면 스택이 이벤트를 소비했으므로 호출부가 전파를 막아 퍼널 가드와
   * 라우터에 닿지 않게 한다.
   */
  handlePop(): { consumed: boolean } {
    if (this.pendingTraversal) {
      this.pendingTraversal = false;
      this.adapter.clearTimeout(this.timeoutHandle);
      this.runQueue();

      return { consumed: true };
    }

    if (this.entries.length === 0) return { consumed: false };

    if (this.adapter.href() !== this.href) {
      this.reset();

      return { consumed: false };
    }

    const owner = this.entries.pop() ?? null;

    if (this.entries.length === 0) this.href = null;

    const layer =
      owner === null
        ? undefined
        : this.layers.find((candidate) => candidate.id === owner);

    if (layer?.kind === 'guard') {
      this.enqueue(() => this.pushEntry(layer.id));
      layer.onBack();

      return { consumed: true };
    }

    // close 레이어는 소비자가 닫기를 거부하면 rearm으로 더미를 다시 쌓아야 하므로 layers에는 남겨 둔다.
    // 소비자가 실제로 닫으면 close(id)가 지운다.
    layer?.onBack();

    this.consumeTrailingOrphans();

    return { consumed: true };
  }

  /**
   * 모든 레이어를 버리고 남은 더미를 한 번에 되감은 뒤 이동한다.
   *
   * @param navigate 실행할 이동. 큐 끝에 들어가 앞선 쌓기와 되감기의 popstate가 돌아온 뒤
   * 실행된다. 더미와 대기 작업이 모두 없으면 즉시 실행한다.
   */
  leave(navigate: () => void): void {
    const count = this.entries.length;

    this.resetLayers();

    if (count === 0 && !this.pendingTraversal && this.queue.length === 0) {
      navigate();

      return;
    }

    if (count > 0) this.enqueueGo(-count);

    this.enqueue(navigate);
  }

  /**
   * 퍼널 이탈을 확정한다. 더미를 되감은 뒤 `go(-1)`로 퍼널 진입 직전 화면까지 한 칸 더
   * 물러난다. 이 마지막 popstate는 스택이 흡수하지 않는다.
   */
  confirmLeave(): void {
    // 더미 정리만 흡수하고 실제 화면 이동의 popstate는 라우터에 넘긴다.
    this.leave(() => this.adapter.go(-1));
  }

  private pushEntry(id: string): void {
    if (this.entries.length === 0) this.href = this.adapter.href();

    this.adapter.pushEntry();
    this.entries.push(id);
  }

  /** 맨 위부터 이어지는 주인 없는 칸을 한 번의 되감기로 소비한다. */
  private consumeTrailingOrphans(): void {
    let count = 0;

    while (
      count < this.entries.length &&
      this.entries[this.entries.length - 1 - count] === null
    ) {
      count += 1;
    }

    if (count === 0) return;

    this.entries.length -= count;

    if (this.entries.length === 0) this.href = null;

    this.enqueueGo(-count);
  }

  private enqueue(task: () => void): void {
    this.queue.push(task);
    this.runQueue();
  }

  private enqueueGo(delta: number): void {
    this.enqueue(() => {
      this.pendingTraversal = true;
      this.timeoutHandle = this.adapter.setTimeout(() => {
        this.pendingTraversal = false;
        this.queue = [];
      }, TRAVERSAL_TIMEOUT_MS);
      this.adapter.go(delta);
    });
  }

  private runQueue(): void {
    while (!this.pendingTraversal && this.queue.length > 0) {
      const task = this.queue.shift();

      task?.();
    }
  }

  private resetLayers(): void {
    this.cancelInputWatch?.();
    this.cancelInputWatch = null;
    this.layers = [];
    this.entries = [];
    this.href = null;
  }

  private reset(): void {
    this.resetLayers();
    this.queue = [];
    this.pendingTraversal = false;
    this.adapter.clearTimeout(this.timeoutHandle);
  }
}
