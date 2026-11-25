'use client';

import { type PropsWithChildren, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import {
  IS_META_PIXEL_ENABLED,
  META_PIXEL_ID,
} from '@/observability/marketing/config';
import { loadMetaPixel, trackMetaPixel } from '@/observability/marketing/pixel';

/** StrictMode의 이중 effect와 재마운트에서 픽셀 스크립트를 두 번 불러오지 않도록 막는 모듈 가드다. */
let initialized = false;

/**
 * Meta 픽셀을 한 번 불러오고 경로가 바뀔 때마다 PageView를 보낸다. 픽셀이 꺼진 환경이거나 ID가 없으면
 * 불러오지 않는다. 자식은 그대로 그린다.
 */
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
