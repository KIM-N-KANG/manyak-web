'use client';

import { useEffect } from 'react';

import { anchorDocumentScroll, isInAppBrowser } from '@/lib/in-app-browser';

/**
 * 인앱 브라우저에서만 문서 스크롤 위치를 1px에 붙잡아, 앱 안쪽 목록을 위로 스크롤할 때 브라우저의
 * 당겨서 닫기 제스처가 끼어들지 않게 한다. 화면에는 아무것도 그리지 않는다.
 *
 * @see anchorDocumentScroll
 */
export function InAppScrollAnchor() {
  useEffect(() => {
    if (!isInAppBrowser(navigator.userAgent)) return;

    return anchorDocumentScroll();
  }, []);

  return null;
}
