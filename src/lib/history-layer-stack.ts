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

  close(id: string): void {
    const index = this.layers.findIndex((layer) => layer.id === id);

    if (index === -1) return;

    this.layers.splice(index, 1);

    const entryIndex = this.entries.lastIndexOf(id);

    if (entryIndex === -1) return;

    this.entries[entryIndex] = null;
    this.consumeTrailingOrphans();
  }

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

  confirmLeave(): void {
    const count = this.entries.length;

    this.resetLayers();
    this.enqueueGo(-(count + 1));
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
