import { type RefObject, useLayoutEffect, useRef } from 'react';

/** 시안 스크립트의 `wait`·`frame`과 같은 대기 함수 묶음. 루프가 중단되면 거부한다. */
export type Timeline = {
  wait: (ms: number) => Promise<void>;
  frame: () => Promise<void>;
};

/**
 * 시작 함수가 done을 부를 때까지 기다리고, 중단 신호가 오면 정리 함수를 부른 뒤 거부한다.
 *
 * @param signal 루프 중단 신호
 * @param start 대기를 시작하고 정리 함수를 돌려주는 함수
 * @returns 대기가 끝나면 이행되는 Promise
 */
function waitUntil(
  signal: AbortSignal,
  start: (done: () => void) => () => void,
) {
  return new Promise<void>((resolve, reject) => {
    const stop = start(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    });

    function abort() {
      stop();
      reject(signal.reason);
    }

    signal.addEventListener('abort', abort, { once: true });
  });
}

/**
 * 중단 신호에 묶인 대기 함수를 만든다. 박자는 시안처럼 setTimeout으로 재고, 탭이 가려져 있으면
 * 다시 보일 때까지 다음 단계로 넘어가지 않는다.
 *
 * @param signal 루프 중단 신호
 * @returns 대기 함수 묶음
 */
function createTimeline(signal: AbortSignal): Timeline {
  const untilVisible = () =>
    waitUntil(signal, (done) => {
      const handleChange = () => {
        if (!document.hidden) done();
      };

      document.addEventListener('visibilitychange', handleChange);

      return () =>
        document.removeEventListener('visibilitychange', handleChange);
    });

  return {
    wait: async (ms) => {
      await waitUntil(signal, (done) => {
        const timer = window.setTimeout(done, ms);

        return () => window.clearTimeout(timer);
      });

      if (document.hidden) await untilVisible();
    },
    frame: () =>
      waitUntil(signal, (done) => {
        let id = requestAnimationFrame(() => {
          id = requestAnimationFrame(done);
        });

        return () => cancelAnimationFrame(id);
      }),
  };
}

/**
 * 루트 아래에서 클래스가 className인 요소를 모두 찾는다.
 *
 * @param root 찾을 범위의 루트 요소
 * @param className CSS 모듈 클래스 이름
 * @returns 문서 순서대로 찾은 요소 배열
 */
export function all(root: HTMLElement, className: string) {
  return [...root.querySelectorAll<HTMLElement>(`.${className}`)];
}

/**
 * 루트 아래에서 클래스가 className인 요소 하나를 찾는다.
 *
 * @param root 찾을 범위의 루트 요소
 * @param className CSS 모듈 클래스 이름
 * @returns 처음 찾은 요소
 * @throws 마크업에 해당 요소가 없으면 던진다.
 */
export function one(root: HTMLElement, className: string) {
  const element = root.querySelector<HTMLElement>(`.${className}`);

  if (!element) {
    throw new Error(`일러스트에 .${className} 요소가 없다.`);
  }

  return element;
}

/**
 * 장식 일러스트의 무한 루프를 돌리는 훅. 마크업은 React가 그리고, 루프는 시안 스크립트처럼 클래스만
 * 바꿔 CSS 전환을 일으킨다. 화면을 떠나 언마운트되면 루프를 중단하고, 동작 줄이기 설정이면 루프 없이
 * 완성 상태만 둔다.
 *
 * @param play 루프 본문. 모듈 수준 함수로 넘겨 참조가 바뀌지 않게 한다.
 * @param still 동작 줄이기 설정에서 완성 상태를 그리는 함수
 * @returns 일러스트 루트에 붙일 ref
 */
export function useIllustrationTimeline(
  play: (root: HTMLElement, timeline: Timeline) => Promise<void>,
  still: (root: HTMLElement) => void,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  // 첫 페인트 전에 정지 화면을 채워 빈 상태가 한 프레임 비치지 않게 한다.
  useLayoutEffect(() => {
    const root = ref.current;

    if (!root) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      still(root);

      return;
    }

    const controller = new AbortController();

    play(root, createTimeline(controller.signal)).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        throw error;
      }
    });

    return () => controller.abort();
  }, [play, still]);

  return ref;
}
