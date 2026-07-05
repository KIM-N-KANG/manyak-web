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

    const viewportMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );

    if (viewportMeta && !viewportMeta.content.includes('maximum-scale')) {
      viewportMeta.content = `${viewportMeta.content}, maximum-scale=1`;
    }
  }, []);

  return null;
}
