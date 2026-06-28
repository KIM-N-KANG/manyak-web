'use client';

import { Marker, MarkerContent } from '@/components/ui/marker';
import { useTypewriter } from '@/hooks/use-typewriter';

const LOADING_PHRASES = ['.....', '.....', '.....'];

export function ChatStreamLoading() {
  const text = useTypewriter(LOADING_PHRASES);

  return (
    <Marker role="status">
      <MarkerContent
        className="min-h-lh shimmer"
        aria-label="답변을 작성하고 있어요">
        {text}
      </MarkerContent>
    </Marker>
  );
}
