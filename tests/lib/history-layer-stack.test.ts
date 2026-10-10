import { describe, expect, it, vi } from 'vitest';

import {
  type HistoryAdapter,
  type HistoryLayer,
  HistoryLayerStack,
  TRAVERSAL_TIMEOUT_MS,
} from '@/lib/history-layer-stack';

/** 브라우저 히스토리를 흉내 내는 가짜 어댑터. go는 바로 pop을 내지 않고 handlePop으로 수동 전달한다. */
function createFakeHistory({
  active = true,
  href: initialHref = 'http://app/stories/1',
} = {}) {
  const calls: string[] = [];
  let href = initialHref;
  let pendingInput: (() => void) | null = null;
  let timeoutCallback: (() => void) | null = null;
  const adapter: HistoryAdapter = {
    pushEntry: () => {
      calls.push('push');
    },
    go: (delta) => {
      calls.push(`go(${delta})`);
    },
    href: () => href,
    isUserActive: () => active,
    onceUserInput: (callback) => {
      pendingInput = callback;

      return () => {
        pendingInput = null;
      };
    },
    setTimeout: (callback) => {
      timeoutCallback = callback;

      return 1;
    },
    clearTimeout: () => {
      timeoutCallback = null;
    },
  };
  const stack = new HistoryLayerStack(adapter);

  return {
    stack,
    calls,
    setHref: (next: string) => {
      href = next;
    },
    userInput: () => pendingInput?.(),
    fireTimeout: () => timeoutCallback?.(),
  };
}

function layer(
  id: string,
  onBack = vi.fn(),
  kind: HistoryLayer['kind'] = 'close',
): HistoryLayer {
  return { id, kind, onBack };
}

describe('HistoryLayerStack', () => {
  it('레이어를 열면 더미를 한 칸 쌓고 뒤로가기로 닫는다', () => {
    const { stack, calls } = createFakeHistory();
    const onBack = vi.fn();

    stack.open(layer('a', onBack));
    expect(calls).toEqual(['push']);

    expect(stack.handlePop()).toEqual({ consumed: true });
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(stack.hasEntry('a')).toBe(false);
  });

  it('더미가 없으면 pop을 넘긴다', () => {
    const { stack } = createFakeHistory();

    expect(stack.handlePop()).toEqual({ consumed: false });
  });

  it('UI 닫기가 맨 위 더미를 소비한다', () => {
    const { stack, calls } = createFakeHistory();

    stack.open(layer('a'));
    stack.close('a');
    expect(calls).toEqual(['push', 'go(-1)']);

    // 되감기 결과 pop은 흡수되고 이후 pop은 넘긴다.
    expect(stack.handlePop()).toEqual({ consumed: true });
    expect(stack.handlePop()).toEqual({ consumed: false });
  });

  it('닫기 뒤 열기는 pop 뒤에 쌓는다', () => {
    const { stack, calls } = createFakeHistory();

    stack.open(layer('drawer'));
    stack.close('drawer');
    stack.open(layer('dialog'));
    expect(calls).toEqual(['push', 'go(-1)']);

    stack.handlePop();
    expect(calls).toEqual(['push', 'go(-1)', 'push']);
    expect(stack.hasEntry('dialog')).toBe(true);
  });

  it('되감기 대기 중 pop은 흡수된다', () => {
    const { stack, calls } = createFakeHistory();
    const onBack = vi.fn();

    stack.open(layer('a', onBack));
    stack.open(layer('b'));
    stack.close('b');
    expect(stack.handlePop()).toEqual({ consumed: true });
    expect(onBack).not.toHaveBeenCalled();
    expect(calls).toEqual(['push', 'push', 'go(-1)']);
  });

  it('겹친 레이어는 맨 위부터 닫힌다', () => {
    const { stack } = createFakeHistory();
    const first = vi.fn();
    const second = vi.fn();

    stack.open(layer('a', first));
    stack.open(layer('b', second));
    stack.handlePop();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    stack.handlePop();
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('잔여 더미를 이어서 소비한다', () => {
    const { stack, calls } = createFakeHistory();

    stack.open(layer('a'));
    stack.open(layer('b'));
    // 중간 레이어가 먼저 닫히면 더미는 잔여로 남는다.
    stack.close('a');
    expect(calls).toEqual(['push', 'push']);

    // 맨 위를 UI로 닫으면 잔여까지 두 칸을 함께 소비한다.
    stack.close('b');
    expect(calls).toEqual(['push', 'push', 'go(-2)']);
  });

  it('뒤로가기로 맨 위를 닫은 뒤 잔여가 남으면 바로 소비한다', () => {
    const { stack, calls } = createFakeHistory();

    stack.open(layer('a'));
    stack.open(layer('b'));
    stack.close('a');
    stack.handlePop();
    expect(calls).toEqual(['push', 'push', 'go(-1)']);
  });

  it('잠금 레이어는 rearm으로 더미를 다시 쌓는다', () => {
    const { stack, calls } = createFakeHistory();
    const onBack = vi.fn();

    stack.open(layer('a', onBack));
    stack.handlePop();
    expect(stack.hasEntry('a')).toBe(false);
    stack.rearm('a');
    expect(calls).toEqual(['push', 'push']);
    expect(stack.hasEntry('a')).toBe(true);
    // 레이어가 여전히 열려 있으므로 다시 뒤로가기를 받는다.
    stack.handlePop();
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('rearm은 더미가 있거나 레이어가 없으면 무시한다', () => {
    const { stack, calls } = createFakeHistory();

    stack.open(layer('a'));
    stack.rearm('a');
    stack.rearm('missing');
    expect(calls).toEqual(['push']);
  });

  it('가드 레이어는 pop마다 더미를 다시 쌓고 onBack을 부른다', () => {
    const { stack, calls } = createFakeHistory();
    const onBack = vi.fn();

    stack.open(layer('guard', onBack, 'guard'));
    stack.handlePop();
    stack.handlePop();
    expect(onBack).toHaveBeenCalledTimes(2);
    expect(calls).toEqual(['push', 'push', 'push']);
  });

  it('confirmLeave는 더미 수 + 1만큼 되감고 모든 레이어를 버린다', () => {
    const { stack, calls } = createFakeHistory();

    stack.open(layer('guard', vi.fn(), 'guard'));
    stack.open(layer('dialog'));
    stack.confirmLeave();
    expect(calls).toEqual(['push', 'push', 'go(-3)']);
    // 버린 레이어의 뒤늦은 close는 무시된다.
    stack.handlePop();
    stack.close('dialog');
    expect(calls).toEqual(['push', 'push', 'go(-3)']);
  });

  it('leave는 더미를 모두 소비한 뒤 이동한다', () => {
    const { stack, calls } = createFakeHistory();
    const navigate = vi.fn();

    stack.open(layer('a'));
    stack.open(layer('b'));
    stack.leave(navigate);
    expect(calls).toEqual(['push', 'push', 'go(-2)']);
    expect(navigate).not.toHaveBeenCalled();
    stack.handlePop();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('leave는 더미가 없으면 바로 이동한다', () => {
    const { stack } = createFakeHistory();
    const navigate = vi.fn();

    stack.leave(navigate);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('href가 다르면 초기화하고 넘긴다', () => {
    const { stack, setHref } = createFakeHistory();
    const onBack = vi.fn();

    stack.open(layer('a', onBack));
    setHref('http://app/');
    expect(stack.handlePop()).toEqual({ consumed: false });
    expect(onBack).not.toHaveBeenCalled();
    expect(stack.hasEntry('a')).toBe(false);
  });

  it('활성화가 없으면 close 레이어는 더미 없이 열리고 뒤로가기를 받지 않는다', () => {
    const { stack, calls } = createFakeHistory({ active: false });
    const onBack = vi.fn();

    stack.open(layer('a', onBack));
    expect(calls).toEqual([]);
    expect(stack.handlePop()).toEqual({ consumed: false });
    expect(onBack).not.toHaveBeenCalled();
  });

  it('활성화가 없는 가드 레이어는 첫 사용자 입력에서 더미를 쌓는다', () => {
    const { stack, calls, userInput } = createFakeHistory({ active: false });

    stack.open(layer('guard', vi.fn(), 'guard'));
    expect(calls).toEqual([]);
    userInput();
    expect(calls).toEqual(['push']);
  });

  it('되감기가 시간 안에 돌아오지 않으면 큐를 비운다', () => {
    const { stack, calls, fireTimeout } = createFakeHistory();

    stack.open(layer('a'));
    stack.close('a');
    stack.open(layer('b'));
    fireTimeout();
    expect(calls).toEqual(['push', 'go(-1)']);
    // 끊긴 되감기 뒤 도착한 pop은 넘긴다.
    expect(stack.handlePop()).toEqual({ consumed: false });
  });

  it('타임아웃 상수는 1초다', () => {
    expect(TRAVERSAL_TIMEOUT_MS).toBe(1000);
  });
});
