'use client';

import { m } from 'motion/react';

import { Marker, MarkerContent } from '@/components/ui/marker';

const DOT_COUNT = 3;

export function ChatStreamLoading() {
  return (
    <Marker role="status">
      <MarkerContent className="min-h-lh" aria-label="답변을 작성하고 있어요">
        <span aria-hidden="true" className="inline-flex gap-0.5">
          {Array.from({ length: DOT_COUNT }, (_, index) => (
            <m.span
              key={index}
              className="inline-block"
              animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.2,
              }}>
              .
            </m.span>
          ))}
        </span>
      </MarkerContent>
    </Marker>
  );
}
