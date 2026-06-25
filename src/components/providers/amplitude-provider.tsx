'use client';

import { type PropsWithChildren, useEffect } from 'react';

import * as amplitude from '@amplitude/unified';

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? '';

let initialized = false;

export function AmplitudeProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (initialized) return;

    initialized = true;

    amplitude.initAll(AMPLITUDE_API_KEY, {
      analytics: { autocapture: true },
      sessionReplay: { sampleRate: 1 },
    });
  }, []);

  return children;
}
