'use client';

/**
 * @file 세션과 필수 동의를 한 단계로 판정해 회원 접근 상태를 내려주는 루트 동의 게이트.
 * `useConsentGate`가 세션 판정, 미리 보낸 동의 조회, 이 탭의 가입 대기 조회를 모아
 * `resolvePhase`로 `ConsentGatePhase`를 정하고, `ConsentGate`가 그 단계로
 * `MemberAccessContext`와 `ConsentSheet`를 함께 그린다. 히스토리 이동으로 다시 불러온
 * 문서에 남은 탭 로그인 표시는 떠난 로그인으로 보고 정리한다.
 */

import { type ReactNode, useEffect, useRef } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import {
  getGetUsersMeConsentsQueryKey,
  getUsersMeConsents,
  useGetUsersMeConsents,
} from '@/api/generated/endpoints/users/users';
import type { UserConsentResponse } from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  ConsentSheet,
  type SignupSettlement,
} from '@/features/auth/_shared/components/consent-sheet';
import { MemberAccessContext } from '@/features/auth/_shared/hooks/use-member-access';
import {
  getRequiredConsents,
  hasPendingConsent,
} from '@/features/auth/_shared/utils/consent-status';
import {
  clearPendingLogin,
  hasPendingLogin,
} from '@/features/auth/_shared/utils/pending-login-storage';
import {
  abandonPendingLogin,
  cancelPendingSignupConsent,
  fetchPendingSignupConsent,
} from '@/features/auth/_shared/utils/signup-consent-client';
import { submitMarketingConsentAnswer } from '@/features/my/_shared/utils/marketing-consent-store';
import { notifySessionExpired } from '@/lib/auth/session-expiry';
import { hasMemberSessionCookie } from '@/lib/auth/session-refresh-gate';
import type { SignupConsentSummary } from '@/lib/auth/signup-consent';
import { FetchError } from '@/lib/custom-fetch';

/**
 * 동의 게이트가 판정한 단계.
 * - `guest`: 비로그인 확정. 보호 기능은 로그인 시트로 안내한다.
 * - `checking`: 세션 판정·동의 조회 중. 회원 기능을 열지 않는다(fail-closed).
 * - `required`: 로그인한 세션에 필수 동의가 남아 시트를 띄운다. 동의 전에는 세션이 생기지
 *   않으므로 문서 개정으로 요구 버전이 오른 기존 세션이다. 시트에서 회원 동의 API로 다시 받는다.
 * - `blocked`: 공개 법적 문서 경로에서 동의가 남았다. 시트·로그아웃 없이 회원 기능만 잠근다.
 * - `satisfied`: 필수 동의까지 마친 회원.
 * - `load-error`: 조회가 네트워크·5xx로 실패했다. 시트에서 재시도한다.
 * - `forbidden`: 조회가 403이다(정지 계정 등). 회원 기능을 열지 않고 안내만 한다.
 * - `signup-required`: 이 탭에서 시작한 로그인이 세션 없이 가입 동의를 기다린다. 시트에서
 *   동의를 마쳐야 가입이 완료되고 세션이 생긴다.
 * - `signup-load-error`: 가입 대기 조회가 네트워크·5xx로 실패했다. 시트에서 재시도한다.
 */
export type ConsentGatePhase =
  | 'guest'
  | 'checking'
  | 'required'
  | 'blocked'
  | 'satisfied'
  | 'load-error'
  | 'forbidden'
  | 'signup-required'
  | 'signup-load-error';

/** 가입 대기 조회 쿼리 키. 결과는 페이지 로드당 한 번 읽고 정산 때 직접 비운다. */
const SIGNUP_CONSENT_QUERY_KEY = ['signup-consent'] as const;

/**
 * 동의 시트에서 연 문서를 새 탭으로 읽는 동안 그 탭이 문서를 가리지 않도록, 공개 법적
 * 문서 경로에서는 시트를 띄우지 않고 회원 기능만 잠근다.
 */
const PUBLIC_LEGAL_PATHS: readonly string[] = [
  APP_PATH.TERMS,
  APP_PATH.PRIVACY,
];

/**
 * 이 문서를 뒤로가기·앞으로가기로 불러왔는지 판정한다.
 *
 * @returns 히스토리 이동으로 불러온 문서면 true
 */
function isHistoryTraversalLoad(): boolean {
  const [entry] = performance.getEntriesByType('navigation');

  return (
    entry instanceof PerformanceNavigationTiming &&
    entry.type === 'back_forward'
  );
}

type ResolvePhaseInput = {
  sessionStatus: 'authenticated' | 'loading' | 'unauthenticated';
  consent: UserConsentResponse | undefined;
  error: unknown;
  isPublicLegalPath: boolean;
  /** 비로그인 상태의 가입 대기 조회. 이 탭 로그인 표시가 있을 때만 켠다. */
  signup: {
    enabled: boolean;
    summary: SignupConsentSummary | null | undefined;
    error: unknown;
  };
};

/**
 * 세션 상태·동의 조회 결과·경로·탭 로그인 표시를 한 단계로 접는다. 탭 로그인 표시는 세션이
 * 없는 가입 대기 판정에만 쓴다.
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
  signup,
}: ResolvePhaseInput): ConsentGatePhase {
  if (sessionStatus === 'unauthenticated') {
    if (!signup.enabled) {
      return 'guest';
    }

    if (signup.error) {
      return 'signup-load-error';
    }

    if (signup.summary === undefined) {
      return 'checking';
    }

    return signup.summary && hasPendingConsent(signup.summary.consents)
      ? 'signup-required'
      : 'guest';
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

  return isPublicLegalPath ? 'blocked' : 'required';
}

/**
 * 필수 동의를 한 번 판정해 회원 접근 상태를 하위 트리에 내려주는 게이트 훅. 세션이 없고
 * 이 탭에서 로그인을 시작했으면 가입 대기를 조회해 가입 동의 시트를 띄운다.
 * 동의 조회는 인증 확정 후 사용자별 키로 한 번만 하고(`staleTime: Infinity`), 이후 갱신은
 * 시트의 기록 성공(`applyRecordedConsent`)과 명시 재조회(`reload`)로만 일어난다.
 * 회원 기능과 로그인 후 부수 효과는 전부 `useMemberAccess().isMember`로 이 판정을 재사용한다.
 * 뒤로가기·앞으로가기로 다시 불러온 문서에 남은 탭 표시는 마치지 않고 떠난 로그인으로 보고 정리한다.
 *
 * @returns 게이트 상태와 시트 콜백 묶음
 * - `phase`: 판정한 단계
 * - `required`: 시트에 그릴 필수 항목. 가입 단계는 가입 대기 조회, 그 밖에는 회원 동의 조회에서 뽑는다.
 * - `applyRecordedConsent`: 회원 동의 기록 응답을 쿼리 캐시에 반영하고 광고 동의 답을 넘긴다.
 * - `settleSignup`: 가입 동의 시트의 결과를 정산한다.
 * - `reload`: 현재 단계에 맞는 조회(가입 대기 또는 회원 동의)를 다시 요청한다.
 * - `sheetKey`: 시트의 `key`. 사용자 id(세션이 없으면 `'guest'`)라 사용자가 바뀌면 시트 상태가 초기화된다.
 */
function useConsentGate() {
  const { status, data: session } = useSession();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const queryKey = [...getGetUsersMeConsentsQueryKey(), userId] as const;
  // 회원 세션 쿠키가 있으면 세션 판정(/api/auth/session)을 기다리지 않고 동의 조회를 먼저 보낸다.
  // 두 요청이 직렬이면 회원 목록이 그만큼 늦게 시작하기 때문이다. 판정 순서는 그대로다 —
  // 인증이 확정돼 쿼리가 켜질 때 이 응답을 그대로 쓰고, 게스트로 확정되면 버린다.
  const earlyConsentsRef = useRef<ReturnType<typeof getUsersMeConsents> | null>(
    null,
  );

  useEffect(() => {
    // 게스트로 확정되면 미리 보낸 조회를 버린다. 같은 화면에서 가입 동의를 마쳐 세션이 생겼을 때
    // 세션이 없던 때 보낸 응답(만료된 옛 토큰의 401 등)을 새 회원의 판정에 쓰지 않게 한다.
    if (status === 'unauthenticated') {
      earlyConsentsRef.current = null;

      return;
    }

    if (
      status !== 'loading' ||
      earlyConsentsRef.current ||
      !hasMemberSessionCookie()
    ) {
      return;
    }

    const early = getUsersMeConsents();

    // 게스트로 확정돼 아무도 기다리지 않는 실패가 unhandled rejection이 되지 않게 한다.
    early.catch(() => {});
    earlyConsentsRef.current = early;
  }, [status]);

  const consentsQuery = useGetUsersMeConsents({
    query: {
      queryKey,
      // 미리 보낸 조회가 있으면 한 번만 넘겨받고, 재시도는 새로 요청한다.
      queryFn: () => {
        const early = earlyConsentsRef.current;

        earlyConsentsRef.current = null;

        return early ?? getUsersMeConsents();
      },
      enabled: status === 'authenticated',
      staleTime: Infinity,
    },
  });
  const consent =
    consentsQuery.data?.status === 200 ? consentsQuery.data.data : undefined;
  const isPublicLegalPath = PUBLIC_LEGAL_PATHS.includes(pathname);
  // 대기 조회가 404여도 탭 표시는 지우지 않는다. 인앱 팝업 로그인 중인 원래 탭이 팝업의
  // 동의 필요 알림으로 다시 불러와진 뒤 시트를 이어 가야 한다.
  const signupQuery = useQuery({
    queryKey: SIGNUP_CONSENT_QUERY_KEY,
    queryFn: fetchPendingSignupConsent,
    enabled:
      status === 'unauthenticated' && !isPublicLegalPath && hasPendingLogin(),
    staleTime: Infinity,
    retry: false,
  });
  const phase = resolvePhase({
    sessionStatus: status,
    consent,
    error: consentsQuery.error,
    isPublicLegalPath,
    signup: {
      enabled: signupQuery.isEnabled,
      summary: signupQuery.data,
      error: signupQuery.error,
    },
  });
  const isSignupPhase =
    phase === 'signup-required' || phase === 'signup-load-error';

  // 히스토리 이동으로 돌아온 문서에 남은 탭 표시는 시트를 마치지 않고 떠난 로그인이다. Chrome은
  // 사용자 조작 없이 시트를 연 화면을 뒤로가기 버튼에서 건너뛰어 시트의 취소가 실행되지 않는다.
  // 마운트 시점은 세션 조회 전이라 표시를 지우면 이후 판정이 가입 대기를 조회하지 않는 게스트 경로를 따른다.
  // bfcache 복원은 이전 판정을 그대로 들고 있으므로 정리한 뒤 다시 불러온다.
  useEffect(() => {
    if (hasPendingLogin() && isHistoryTraversalLoad()) {
      abandonPendingLogin();
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || !hasPendingLogin()) {
        return;
      }

      abandonPendingLogin();
      window.location.reload();
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

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

  /**
   * 가입 동의 시트의 결과를 정산한다. 성공은 세션이 회원으로 바뀌어 기존 회원 경로가
   * 이어 가므로 광고 동의 답만 넘긴다. 그 밖에는 탭 표시와 대기 조회를 비워 게스트로 돌린다.
   */
  const settleSignup = (settlement: SignupSettlement) => {
    if (settlement.type === 'completed') {
      submitMarketingConsentAnswer(
        settlement.userId,
        settlement.marketingAccepted,
      );

      return;
    }

    if (settlement.type === 'cancelled') {
      void cancelPendingSignupConsent();
    } else {
      toast.error(
        settlement.type === 'expired'
          ? TOAST_MESSAGE.SIGNUP_CONSENT_EXPIRED
          : TOAST_MESSAGE.SIGNUP_CONSENT_OUTDATED,
      );
    }

    clearPendingLogin();
    queryClient.setQueryData(SIGNUP_CONSENT_QUERY_KEY, null);
  };

  return {
    phase,
    required: getRequiredConsents(
      isSignupPhase ? signupQuery.data?.consents : consent,
    ),
    applyRecordedConsent,
    settleSignup,
    reload: () =>
      void (isSignupPhase ? signupQuery.refetch() : consentsQuery.refetch()),
    sheetKey: userId ?? 'guest',
  };
}

/**
 * 앱 전체를 감싸 회원 접근 상태(`MemberAccessContext`)를 제공하고 동의 시트를 띄우는 루트 게이트.
 *
 * @remarks
 * 내려주는 값은 판정 단계에서만 나온다.
 * - `isMember`: 단계가 `satisfied`(인증되고 필수 동의까지 마침)일 때만 true다.
 * - `isGuest`: 단계가 `guest`(비로그인 확정)일 때만 true다.
 *
 * 그 밖의 단계(`checking`, `required`, `blocked`, `load-error`, `forbidden`, 가입 단계)에서는
 * 둘 다 false라 회원 기능도 열지 않고 로그인 시트도 띄우지 않는다. 세션 판정과 동의 조회가
 * 끝나기 전에도 둘 다 false다.
 *
 * @see useConsentGate
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const {
    phase,
    required,
    applyRecordedConsent,
    settleSignup,
    reload,
    sheetKey,
  } = useConsentGate();

  return (
    <MemberAccessContext.Provider
      value={{ isMember: phase === 'satisfied', isGuest: phase === 'guest' }}>
      {children}
      <ConsentSheet
        key={sheetKey}
        phase={phase}
        required={required}
        onRecorded={applyRecordedConsent}
        onSignupSettled={settleSignup}
        onReload={reload}
      />
    </MemberAccessContext.Provider>
  );
}
