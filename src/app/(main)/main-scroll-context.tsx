'use client';

import { createContext, use } from 'react';

interface MainScrollContextValue {
  hasScrolled: boolean;
}

const MainScrollContext = createContext<MainScrollContextValue | null>(null);

export const MainScrollProvider = MainScrollContext.Provider;

export function useMainScroll() {
  const context = use(MainScrollContext);

  if (!context) {
    throw new Error(
      'useMainScroll는 MainScrollProvider 내부에서만 사용할 수 있어요.',
    );
  }

  return context;
}
