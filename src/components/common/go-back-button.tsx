'use client';

import { useSyncExternalStore } from 'react';

import { useRouter } from 'next/navigation';

import { hasHistoryBelow } from '@/components/providers/in-app-navigation-tracker';
import { Button } from '@/components/ui/button';
import { NOT_FOUND_COPY } from '@/constants/not-found';

const subscribe = () => () => {};

/**
 * 같은 사이트의 이전 기록이 있을 때만 보이는 "이전 화면으로" 버튼.
 * 없는 경로는 Next가 전체 이동으로 열어 늘 새 문서이므로 같은 문서 여부가 아니라 아래 기록 유무로 본다.
 * 서버 렌더와 첫 하이드레이션에서는 숨기고 브라우저에서 히스토리를 읽은 뒤 보인다.
 */
export function GoBackButton() {
  const router = useRouter();
  const canGoBack = useSyncExternalStore(
    subscribe,
    () => hasHistoryBelow(),
    () => false,
  );

  if (!canGoBack) return null;

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={() => router.back()}>
      {NOT_FOUND_COPY.back}
    </Button>
  );
}
