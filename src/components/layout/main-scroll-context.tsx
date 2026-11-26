'use client';

import { createContext, use } from 'react';

interface MainScrollContextValue {
  /** 제작 탭에서 스크롤 영역이 맨 위에서 내려가 있으면 true다. 다른 탭에서는 항상 false다. */
  hasScrolled: boolean;
  /** 스크롤 영역과 같은 박스를 가지는 positioned 래퍼. FAB처럼 스크롤을 따라가지 않는 오버레이의 포털 대상이다. */
  overlayContainer: HTMLElement | null;
  /** 메인 탭의 세로 스크롤 영역. 화면 밖 일정 거리까지 미리 관찰하는 IntersectionObserver의 root로 쓴다. */
  scrollContainer: HTMLElement | null;
}

const MainScrollContext = createContext<MainScrollContextValue | null>(null);

/** 메인 레이아웃이 스크롤 상태와 컨테이너를 내려주는 Provider. `useMainScroll`이 이 값을 읽는다. */
export const MainScrollProvider = MainScrollContext.Provider;

/**
 * 메인 스크롤 컨텍스트에서 스크롤 상태, 오버레이 컨테이너와 스크롤 영역을 읽어온다.
 *
 * @returns 현재 스크롤 상태, 오버레이 컨테이너와 스크롤 영역을 담은 컨텍스트 값
 * @throws MainScrollProvider 외부에서 호출하면 에러
 */
export function useMainScroll() {
  const context = use(MainScrollContext);

  if (!context) {
    throw new Error(
      'useMainScroll는 MainScrollProvider 내부에서만 사용할 수 있어요.',
    );
  }

  return context;
}
