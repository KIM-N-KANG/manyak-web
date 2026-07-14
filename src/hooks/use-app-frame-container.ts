'use client';

import { useEffect, useState } from 'react';

import { APP_FRAME_ID } from '@/constants/app-frame';

/**
 * 앱 프레임(#app-frame) 엘리먼트를 반환한다.
 * Drawer 등을 뷰포트 대신 가운데 정렬된 앱 프레임 안에 포탈할 때 사용한다.
 * 포탈 대상은 마운트 이후 DOM에서만 조회할 수 있어 초기값은 null이다.
 *
 * @returns 앱 프레임 엘리먼트. 마운트 전에는 null
 */
export function useAppFrameContainer() {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContainer(document.getElementById(APP_FRAME_ID));
  }, []);

  return container;
}
