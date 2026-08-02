import { Suspense } from 'react';

import type { Metadata } from 'next';

import { LinkContinueScreen } from '@/features/my/link/components/link-continue-screen';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MyLinkContinuePage() {
  return (
    <Suspense>
      <LinkContinueScreen />
    </Suspense>
  );
}
