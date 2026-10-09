import {
  type HistoryLayerKind,
  HistoryLayerStack,
} from '@/lib/history-layer-stack';

let stack: HistoryLayerStack | null = null;
let sequence = 0;

/**
 * 문서에 하나뿐인 레이어 스택을 돌려준다. 처음 쓸 때 캡처 단계 popstate 리스너를 건다.
 * 캡처 단계에서 소비한 이벤트는 퍼널 가드와 Next 라우터의 리스너에 닿지 않는다.
 *
 * @returns 문서 단위 레이어 스택
 */
function getStack(): HistoryLayerStack {
  if (stack) return stack;

  const created = new HistoryLayerStack({
    // state는 null이어야 한다. 객체면 Next 앱 라우터가 __NA 없는 state에서 전체 리로드한다.
    pushEntry: () => window.history.pushState(null, '', window.location.href),
    go: (delta) => window.history.go(delta),
    href: () => window.location.href,
    // 조작 없이 열린 오버레이는 더미를 쌓지 않는다. API가 없는 브라우저는 활성화로 본다.
    isUserActive: () => navigator.userActivation?.isActive ?? true,
    onceUserInput: (callback) => {
      const handle = () => {
        remove();
        callback();
      };
      const remove = () => {
        window.removeEventListener('pointerdown', handle, true);
        window.removeEventListener('keydown', handle, true);
      };

      window.addEventListener('pointerdown', handle, true);
      window.addEventListener('keydown', handle, true);

      return remove;
    },
    setTimeout: (callback, ms) => window.setTimeout(callback, ms),
    clearTimeout: (handle) => window.clearTimeout(handle as number),
  });

  window.addEventListener(
    'popstate',
    (event) => {
      if (created.handlePop().consumed) event.stopImmediatePropagation();
    },
    true,
  );
  stack = created;

  return created;
}

/**
 * 뒤로가기로 닫히는 레이어를 연다. `close`는 한 번에 소비되고, `guard`는 소비될 때마다 다시 쌓인다.
 *
 * @param options 레이어 종류와 뒤로가기 콜백
 * @returns 레이어 id와 닫기, 잠금 재적재 함수
 */
export function openLayer({
  kind = 'close',
  onBack,
}: {
  kind?: HistoryLayerKind;
  onBack: () => void;
}) {
  const id = `layer-${(sequence += 1)}`;
  const target = getStack();

  target.open({ id, kind, onBack });

  return {
    id,
    close: () => target.close(id),
    rearm: () => target.rearm(id),
  };
}

/**
 * 열린 레이어의 더미를 모두 소비한 뒤 이동한다. 더미가 없으면 바로 이동한다.
 * 시트 안에서 다른 화면으로 가는 모든 이동이 거쳐야 돌아올 때 빈 칸이 남지 않는다.
 *
 * @param navigate 실행할 이동
 */
export function leaveLayers(navigate: () => void): void {
  if (typeof window === 'undefined') {
    navigate();

    return;
  }

  getStack().leave(navigate);
}

/** 퍼널 이탈을 확정한다. 가드와 그 위 레이어를 모두 버리고 퍼널 진입 직전 화면까지 되감는다. */
export function confirmLeaveLayers(): void {
  getStack().confirmLeave();
}
