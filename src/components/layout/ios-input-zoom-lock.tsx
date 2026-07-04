'use client';

import { useEffect } from 'react';

/**
 * iOS Safari는 포커스된 인풋의 font-size가 16px 미만이면 화면을 자동 확대한다.
 * viewport에 maximum-scale=1을 넣으면 이 자동 확대만 차단되고, iOS 10+에서는
 * 사용자 핀치 줌에 maximum-scale이 무시되므로 접근성은 유지된다.
 * Android는 maximum-scale=1이 핀치 줌을 실제로 막으므로 iOS에서만 적용한다.
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

    const viewportMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );

    if (viewportMeta && !viewportMeta.content.includes('maximum-scale')) {
      viewportMeta.content = `${viewportMeta.content}, maximum-scale=1`;
    }
  }, []);

  return null;
}
