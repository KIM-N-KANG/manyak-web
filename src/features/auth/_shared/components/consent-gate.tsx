'use client';

import { type ReactNode, useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import {
  getGetConsentsQueryKey,
  useGetConsents,
} from '@/api/generated/endpoints/user/user';
import type { UserConsentResponse } from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { ConsentSheet } from '@/features/auth/_shared/components/consent-sheet';
import { MemberAccessContext } from '@/features/auth/_shared/hooks/use-member-access';
import {
  getRequiredConsents,
  hasPendingConsent,
} from '@/features/auth/_shared/utils/consent-status';
import {
  clearPendingLogin,
  hasPendingLogin,
} from '@/features/auth/_shared/utils/pending-login-storage';
import { signOutBeforeConsent } from '@/features/auth/_shared/utils/sign-out-before-consent';
import { submitMarketingConsentAnswer } from '@/features/my/_shared/utils/marketing-consent-store';
import { notifySessionExpired } from '@/lib/auth/session-expiry';
import { FetchError } from '@/lib/custom-fetch';

/**
 * 동의 게이트가 판정한 단계.
 * - `guest`: 비로그인 확정. 보호 기능은 로그인 시트로 안내한다.
 * - `checking`: 세션 판정·동의 조회 중. 회원 기능을 열지 않는다(fail-closed).
 * - `required`: 이 탭에서 시작한 로그인에 필수 동의가 남아 시트를 띄운다.
 * - `stale-login`: 필수 동의가 남았는데 이 탭의 로그인 표시가 없다. 이전 탭에서 끝내지
 *   않은 로그인으로 보고 로그아웃한다.
 * - `blocked`: 공개 법적 문서 경로에서 동의가 남았다. 시트·로그아웃 없이 회원 기능만 잠근다.
 * - `satisfied`: 필수 동의까지 마친 회원.
 * - `load-error`: 조회가 네트워크·5xx로 실패했다. 시트에서 재시도한다.
 * - `forbidden`: 조회가 403이다(정지 계정 등). 회원 기능을 열지 않고 안내만 한다.
 */
export type ConsentGatePhase =
  | 'guest'
  | 'checking'
  | 'required'
  | 'stale-login'
  | 'blocked'
  | 'satisfied'
  | 'load-error'
  | 'forbidden';

/**
 * 동의 시트에서 연 문서를 새 탭으로 읽는 동안 원래 탭이 로그아웃되지 않도록, 공개 법적
 * 문서 경로에서는 fail-closed 로그아웃과 시트를 모두 끈다. 새 탭은 이 탭의 로그인 표시를
 * 물려받지 않을 수 있는데(브라우저·noopener에 따라 다르다), 그때 로그아웃하면 공유 쿠키가
 * 지워져 동의 중이던 원래 탭까지 풀린다.
 */
const PUBLIC_LEGAL_PATHS: readonly string[] = [
  APP_PATH.TERMS,
  APP_PATH.PRIVACY,
];

type ResolvePhaseInput = {
  sessionStatus: 'authenticated' | 'loading' | 'unauthenticated';
  consent: UserConsentResponse | undefined;
  error: unknown;
  isPublicLegalPath: boolean;
};

/**
 * 세션 상태·동의 조회 결과·경로·탭 로그인 표시를 한 단계로 접는다.
 * 401은 세션 만료 흐름이 로그아웃시키므로 그동안 `checking`으로 두고, 조회 응답이 오기
 * 전에도 회원 기능을 열지 않는다.
 *
 * @param input 세션 상태, 조회 응답·오류, 공개 법적 문서 경로 여부
 * @returns 판정한 단계
 */
function resolvePhase({
  sessionStatus,
  consent,
  error,
  isPublicLegalPath,
}: ResolvePhaseInput): ConsentGatePhase {
  if (sessionStatus === 'unauthenticated') {
    return 'guest';
  }

  if (sessionStatus === 'loading') {
    return 'checking';
  }

  if (error instanceof FetchError) {
    if (error.status === 401) {
      return 'checking';
    }

    return error.status === 403 ? 'forbidden' : 'load-error';
  }

  if (error) {
    return 'load-error';
  }

  if (!consent) {
    return 'checking';
  }

  if (!hasPendingConsent(consent)) {
    return 'satisfied';
  }

  if (isPublicLegalPath) {
    return 'blocked';
  }

  return hasPendingLogin() ? 'required' : 'stale-login';
}

/**
 * 로그인 직후 필수 동의를 한 번 판정해 회원 접근 상태를 하위 트리에 내려주는 게이트 훅.
 * 동의 조회는 인증 확정 후 사용자별 키로 한 번만 하고(`staleTime: Infinity`), 이후 갱신은
 * 시트의 기록 성공(`applyRecordedConsent`)과 명시 재조회(`reload`)로만 일어난다.
 * 회원 기능과 로그인 후 부수 효과는 전부 `useMemberAccess().isMember`로 이 판정을 재사용한다.
 * fail-closed 로그아웃은 페이지를 다시 불러오지 않고 세션만 비우므로, 같은 탭에서 다시 로그인해
 * 다시 판정할 수 있도록 `stale-login`을 벗어나면 진행 표시를 되돌린다.
 *
 * @returns 판정 단계, 필요 항목, 기록 결과 반영·재조회 함수, 시트 상태를 초기화할 사용자 키
 */
function useConsentGate() {
  const { status, data: session } = useSession();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const queryKey = [...getGetConsentsQueryKey(), userId] as const;
  const consentsQuery = useGetConsents({
    query: {
      queryKey,
      enabled: status === 'authenticated',
      staleTime: Infinity,
    },
  });
  const consent =
    consentsQuery.data?.status === 200 ? consentsQuery.data.data : undefined;
  const phase = resolvePhase({
    sessionStatus: status,
    consent,
    error: consentsQuery.error,
    isPublicLegalPath: PUBLIC_LEGAL_PATHS.includes(pathname),
  });
  const signingOutRef = useRef(false);

  useEffect(() => {
    if (phase === 'satisfied') {
      clearPendingLogin();
    }
  }, [phase]);

  useEffect(() => {
    const { error } = consentsQuery;

    if (error instanceof FetchError && error.status === 401) {
      notifySessionExpired();
    }
  }, [consentsQuery]);

  useEffect(() => {
    if (phase !== 'stale-login') {
      signingOutRef.current = false;

      return;
    }

    if (signingOutRef.current) {
      return;
    }

    signingOutRef.current = true;
    void signOutBeforeConsent();
  }, [phase]);

  const applyRecordedConsent = (
    recorded: UserConsentResponse,
    marketingAccepted: boolean,
  ) => {
    queryClient.setQueryData(queryKey, {
      data: recorded,
      status: 200,
      headers: new Headers(),
    });

    // 필수 동의가 저장된 뒤에야 광고 동의를 저장한다(선택 항목은 완료 조건이 아니다).
    if (userId) {
      submitMarketingConsentAnswer(userId, marketingAccepted);
    }
  };

  return {
    phase,
    required: getRequiredConsents(consent),
    applyRecordedConsent,
    reload: () => void consentsQuery.refetch(),
    sheetKey: userId ?? 'guest',
  };
}

export function ConsentGate({ children }: { children: ReactNode }) {
  const { phase, required, applyRecordedConsent, reload, sheetKey } =
    useConsentGate();

  return (
    <MemberAccessContext.Provider
      value={{ isMember: phase === 'satisfied', isGuest: phase === 'guest' }}>
      {children}
      <ConsentSheet
        key={sheetKey}
        phase={phase}
        required={required}
        onRecorded={applyRecordedConsent}
        onReload={reload}
      />
    </MemberAccessContext.Provider>
  );
}
