'use client';

import { createContext, use } from 'react';

interface MainScrollContextValue {
  hasScrolled: boolean;
}

const MainScrollContext = createContext<MainScrollContextValue | null>(null);

export const MainScrollProvider = MainScrollContext.Provider;

/**
 * 메인 스크롤 컨텍스트에서 스크롤 여부 상태를 읽어온다.
 *
 * @returns 현재 스크롤 상태를 담은 컨텍스트 값
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
