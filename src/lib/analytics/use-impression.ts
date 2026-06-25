import { useEffect, useRef, useState } from 'react';

import { impressionKey, shouldEmitImpression } from './impression';

const lastEmittedByKey = new Map<string, number>();
const MIN_VISIBLE_MS = 1000;
const VISIBLE_RATIO = 0.5;

export function useImpression(input: {
  object: string;
  itemId: string | number;
  screen: string;
  onImpress: () => void;
}) {
  const [node, setNode] = useState<Element | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
              input.onImpress();
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
