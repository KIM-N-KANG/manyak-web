'use client';

import { useEffect } from 'react';

/**
 * iOS에서 글자 크기가 작은 입력 칸에 포커스할 때 화면이 자동 확대되지 않도록 viewport 메타에
 * `maximum-scale=1`을 붙인다. iOS는 이 값이 있어도 핀치 확대를 허용하지만 Android는 막으므로 iOS에서만 붙인다.
 * Next가 클라이언트 이동마다 viewport 메타를 교체하므로 head를 지켜보며 다시 붙인다. 화면에는 아무것도 그리지 않는다.
 */
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
