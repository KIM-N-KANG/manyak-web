'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { usePathname } from 'next/navigation';

import { GuestConsentSheet } from '@/features/auth/_shared/components/guest-consent-sheet';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';

const GuestConsentContext = createContext({
  requestConsent: async (): Promise<boolean> => false,
  open: false,
});
const HISTORY_KEY = 'manyakGuestConsent';

/**
 * 회원 접근 또는 게스트 동의를 확인하고 대기 중인 한 동작만 재개한다.
 * @returns 동의 확인 함수
 */
export function useGuestConsent() {
  return useContext(GuestConsentContext).requestConsent;
}

/**
 * 동의 시트가 뒤로가기를 처리하는 동안 하위 화면의 이탈 확인을 잠근다.
 * @returns 게스트 동의 시트 열림 여부
 */
export function useGuestConsentOpen() {
  return useContext(GuestConsentContext).open;
}

export function GuestConsentProvider({ children }: { children: ReactNode }) {
  const { isMember, isGuest } = useMemberAccess();
  const pathname = usePathname();
  const [requestPath, setRequestPath] = useState<string | null>(null);
  const open = requestPath === pathname && isGuest;
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  const finish = useRef<(accepted: boolean) => void>(() => {});

  useEffect(() => {
    if (!open) return;

    const href = window.location.href;
    let accepted = false;
    let closing = false;
    let consumed = false;
    const settle = (result: boolean) => {
      const resolve = pending.current;

      pending.current = null;
      setRequestPath(null);
      resolve?.(result);
    };
    const onPop = (event: PopStateEvent) => {
      if (window.location.href === href) event.stopImmediatePropagation();

      consumed = true;

      const valid = accepted && isGuest && window.location.href === href;

      settle(valid);
    };

    window.history.pushState(
      { ...window.history.state, [HISTORY_KEY]: true },
      '',
      href,
    );
    window.addEventListener('popstate', onPop, true);
    finish.current = (result) => {
      if (closing) return;

      if (window.location.href !== href) {
        settle(false);

        return;
      }

      closing = true;
      accepted = result;
      window.history.back();
    };

    return () => {
      window.removeEventListener('popstate', onPop, true);
      finish.current = () => {};

      const resolve = pending.current;

      pending.current = null;
      resolve?.(false);
      setRequestPath(null);

      if (
        !consumed &&
        window.location.href === href &&
        window.history.state?.[HISTORY_KEY]
      ) {
        window.history.replaceState(
          { ...window.history.state, [HISTORY_KEY]: undefined },
          '',
          href,
        );
      }
    };
  }, [open, pathname, isGuest, isMember]);

  const requestConsent = async () => {
    if (isMember) return true;

    if (!isGuest || pending.current) return false;

    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setRequestPath(pathname);
    });
  };

  return (
    <GuestConsentContext value={{ requestConsent, open }}>
      {children}
      {open && isGuest && (
        <GuestConsentSheet onFinish={(accepted) => finish.current(accepted)} />
      )}
    </GuestConsentContext>
  );
}
