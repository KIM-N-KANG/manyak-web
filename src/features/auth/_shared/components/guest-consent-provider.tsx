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
import { useBackLayer } from '@/hooks/use-back-layer';
import { leaveLayers } from '@/lib/history-layers';

/** 프로바이더 밖의 기본값은 동의 요청을 항상 거절(false)하고 시트를 열지 않는다. */
const GuestConsentContext = createContext({
  requestConsent: async (): Promise<boolean> => false,
  open: false,
});

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

/**
 * 게스트가 보호 동작을 시도할 때 게스트 동의 시트를 띄우고 결과를 Promise로 돌려주는 프로바이더.
 *
 * @remarks
 * `requestConsent`는 회원이면 바로 true, 게스트로 확정되지 않았으면 false로 끝난다. 게스트면
 * 요청한 경로를 기억해 시트를 열고 시트가 끝날 때까지 기다린다. 대기 슬롯은 하나뿐이라
 * 이미 대기 중인 요청이 있으면 새 요청은 바로 false다.
 *
 * 대기 중인 요청은 시트 결과 외에도 뒤로가기, 경로 변경, 인증 상태 변경으로 시트가 닫히면
 * false로 끝난다. 시트 결과로 끝낼 때는 `leaveLayers`로 시트의 히스토리 더미를 먼저 소비한
 * 뒤 결과를 넘겨, 재개한 동작이 이동해도 그 아래에 빈 히스토리 칸이 남지 않게 한다.
 */
export function GuestConsentProvider({ children }: { children: ReactNode }) {
  const { isMember, isGuest } = useMemberAccess();
  const pathname = usePathname();
  const [requestPath, setRequestPath] = useState<string | null>(null);
  const open = requestPath === pathname && isGuest;
  const pending = useRef<((accepted: boolean) => void) | null>(null);

  const settle = (result: boolean) => {
    const resolve = pending.current;

    pending.current = null;
    setRequestPath(null);
    resolve?.(result);
  };

  // 뒤로가기는 대기 동작을 취소한다. 더미는 매니저가 소비했으므로 바로 정리한다.
  useBackLayer({ open, onBack: () => settle(false) });

  // 화면이나 인증 상태가 바뀌어 닫히면 대기 동작을 취소한다.
  useEffect(() => {
    if (!open) return;

    return () => {
      const resolve = pending.current;

      pending.current = null;
      setRequestPath(null);
      resolve?.(false);
    };
  }, [open]);

  // 시트 더미를 먼저 소비해 재개한 동작의 이동 아래에 빈 칸이 남지 않게 한다.
  const finish = (result: boolean) =>
    leaveLayers(() => settle(isGuest && result));

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
      {open && isGuest && <GuestConsentSheet onFinish={finish} />}
    </GuestConsentContext>
  );
}
