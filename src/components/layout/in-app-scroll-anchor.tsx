'use client';

import { useEffect } from 'react';

import { anchorDocumentScroll, isInAppBrowser } from '@/lib/in-app-browser';

export function InAppScrollAnchor() {
  useEffect(() => {
    if (!isInAppBrowser(navigator.userAgent)) return;

    return anchorDocumentScroll();
  }, []);

  return null;
}
