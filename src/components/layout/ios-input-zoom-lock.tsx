'use client';

import { useEffect } from 'react';

export function IosInputZoomLock() {
  useEffect(() => {
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Macintosh') &&
        navigator.maxTouchPoints > 1);

    if (!isIos) {
      return;
    }

    const lock = () => {
      const viewportMeta = document.querySelector<HTMLMetaElement>(
        'meta[name="viewport"]',
      );

      if (viewportMeta && !viewportMeta.content.includes('maximum-scale')) {
        viewportMeta.content = `${viewportMeta.content}, maximum-scale=1`;
      }
    };

    lock();

    // Next는 클라이언트 이동마다 viewport 메타를 새 요소로 바꾸므로 head 변경 때마다 다시 붙인다.
    const observer = new MutationObserver(lock);

    observer.observe(document.head, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
