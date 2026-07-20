'use client';

import { type PropsWithChildren, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import {
  IS_META_PIXEL_ENABLED,
  META_PIXEL_ID,
} from '@/observability/marketing/config';
import { loadMetaPixel, trackMetaPixel } from '@/observability/marketing/pixel';

let initialized = false;

export function MetaPixelProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();

  useEffect(() => {
    if (!IS_META_PIXEL_ENABLED || initialized || !META_PIXEL_ID) return;

    initialized = true;
    loadMetaPixel(META_PIXEL_ID);
  }, []);

  useEffect(() => {
    trackMetaPixel('PageView');
  }, [pathname]);

  return children;
}
