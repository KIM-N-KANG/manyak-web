import { Suspense } from 'react';

import type { Metadata } from 'next';

import { LoginContinueScreen } from '@/features/auth/continue/components/login-continue-screen';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginContinuePage() {
  return (
    <Suspense>
      <LoginContinueScreen />
    </Suspense>
  );
}
