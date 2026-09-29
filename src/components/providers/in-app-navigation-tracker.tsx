'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

let hasNavigatedInApp = false;

/**
 * 이 문서에서 앱 안 경로 이동이 한 번이라도 있었는지 반환한다.
 * false면 현재 화면이 탭의 첫 진입(공유·외부 링크)이라 헤더 뒤로가기로 돌아갈 앱 화면이 없다.
 * `history.length`는 인앱 브라우저·자동화 브라우저가 빈 첫 기록을 남기면 부풀어 쓰지 않는다.
 *
 * @returns 앱 안 이동이 있었으면 true
 */
export function hasInAppNavigation(): boolean {
  return hasNavigatedInApp;
}

export function InAppNavigationTracker() {
  const pathname = usePathname();
  const landingPathnameRef = useRef(pathname);

  useEffect(() => {
    if (pathname !== landingPathnameRef.current) {
      hasNavigatedInApp = true;
    }
  }, [pathname]);

  return null;
}
