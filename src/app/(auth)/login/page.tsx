import { Suspense } from 'react';

import { LoginScreen } from '@/features/auth/login/components/login-screen';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
