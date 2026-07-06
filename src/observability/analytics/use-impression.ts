import { useEffect, useRef, useState } from 'react';

import { impressionKey, shouldEmitImpression } from './impression';

const lastEmittedByKey = new Map<string, number>();
const MIN_VISIBLE_MS = 1000;
const VISIBLE_RATIO = 0.5;

/**
 * 요소가 50% 이상 1초 동안 보이면 onImpress를 호출하는 훅.
 * 같은 항목은 쿨링 시간 내 재전송을 막으며, 관찰 대상에 연결할 ref 콜백을 반환한다.
 */
export function useImpression(input: {
  object: string;
  itemId: string | number;
  screen: string;
  onImpress: () => void;
}) {
  const [node, setNode] = useState<Element | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onImpressRef = useRef(input.onImpress);

  useEffect(() => {
    onImpressRef.current = input.onImpress;
  });

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
          if (timerRef.current) return;

          timerRef.current = setTimeout(() => {
            const key = impressionKey(input);
            const now = Date.now();

            if (shouldEmitImpression(lastEmittedByKey.get(key), now)) {
              lastEmittedByKey.set(key, now);
              onImpressRef.current();
            }
          }, MIN_VISIBLE_MS);
        } else if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      },
      { threshold: VISIBLE_RATIO },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, input.object, input.itemId, input.screen]);

  return setNode;
}
