'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import type { LoginHandoffSummaryResponse } from '@/api/generated/models';
import { ListStatus } from '@/components/common/list-status';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { BackHeader } from '@/components/layout/back-header';
import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { GoogleLogo } from '@/features/auth/_shared/components/google-logo';
import { resolveLoginCallbackUrl } from '@/features/auth/_shared/utils/login-callback-url';
import { startGoogleLogin } from '@/features/auth/_shared/utils/start-google-login';
import { markOnboardingSeen } from '@/features/onboarding/utils/onboarding-storage';
import { HANDOFF_QUERY_PARAM } from '@/lib/auth/handoff-query';
import { detectInAppBrowser } from '@/lib/in-app-browser';
import { track } from '@/observability/analytics';

import { InAppEscapeGuide } from './in-app-escape-guide';

const HANDOFF_SESSION_ENDPOINT = '/api/auth/handoff-session';

/**
 * 아무 것도 구독하지 않는 useSyncExternalStore용 빈 구독 함수를 만든다.
 *
 * @returns 구독 해제용 no-op 함수
 */
const emptySubscribe = () => () => {};

/**
 * 핸드오프 수령 결과. 만료(재시도 무의미)와 일시적 실패(재시도 가능)를 구분한다.
 */
type HandoffReceipt =
  | { kind: 'received'; summary: LoginHandoffSummaryResponse }
  | { kind: 'expired' }
  | { kind: 'failed' };

/**
 * 핸드오프 코드를 BFF(/api/auth/handoff-session)에 제출해 HttpOnly 쿠키로 옮긴다.
 * 코드는 body로만 보내고 응답은 안내용 요약만 받는다.
 * 만료·무효는 404로만 판정하고, 5xx·네트워크 실패는 재시도 가능한 실패로 돌린다.
 *
 * @param code URL 쿼리에서 읽은 핸드오프 코드
 * @returns 요약을 담은 수령 결과, 또는 만료·실패 결과
 */
async function submitHandoffSession(code: string): Promise<HandoffReceipt> {
  let response: Response;

  try {
    response = await fetch(HANDOFF_SESSION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
  } catch {
    return { kind: 'failed' };
  }

  if (response.status === 404) {
    return { kind: 'expired' };
  }

  if (!response.ok) {
    return { kind: 'failed' };
  }

  try {
    return {
      kind: 'received',
      summary: (await response.json()) as LoginHandoffSummaryResponse,
    };
  } catch {
    return { kind: 'failed' };
  }
}

/**
 * 외부 브라우저에서 핸드오프를 수령하고, 성공 시 온보딩 완료를 마킹한다.
 * 핸드오프 유입 사용자는 인앱에서 이미 체험했으므로, 로그인 취소 후 게스트 진입·로그아웃
 * 후 재방문에서 온보딩이 다시 뜨지 않게 한다(스펙 §3-10 흐름 5의 곁가지 경로 보정).
 *
 * @param code URL 쿼리에서 읽은 핸드오프 코드
 * @returns 수령 결과(만료·실패 포함)
 */
async function receiveHandoff(code: string): Promise<HandoffReceipt> {
  const receipt = await submitHandoffSession(code);

  if (receipt.kind === 'received') {
    markOnboardingSeen();
  }

  return receipt;
}

/**
 * URL에 남은 핸드오프 코드를 지운다.
 * 코드는 이미 HttpOnly 쿠키로 옮겨졌으므로 히스토리·Referer에 원문을 남기지 않는다.
 * 이 라우트는 프로덕션에서 정적 프리렌더되어 `router.replace`로 같은 경로에 쿼리만
 * 바꾸면 라우터가 동일 엔트리로 보고 히스토리를 갱신하지 않는다(dev에서는 항상 동적이라
 * 통과해 CI에서만 드러났다). 이동이 아닌 히스토리 치환이 필요한 자리다.
 */
function stripHandoffQuery() {
  window.history.replaceState(null, '', APP_PATH.LOGIN_CONTINUE);
}

/** 외부 랜딩이 그릴 수 있는 화면 단계. */
type LandingPhase = 'loading' | 'ready' | 'expired' | 'failed';

/**
 * 수령 결과를 화면 단계로 반영한다.
 * 성공한 경우에만 조회 이벤트를 남기고 URL에서 코드를 지운다 — 실패 화면은 재시도가
 * 같은 코드를 다시 써야 하므로 쿼리를 남겨둔다.
 *
 * @param receipt 수령 결과
 * @param setPhase 화면 단계 setter
 * @param setSummary 안내 요약 setter
 */
function applyReceipt(
  receipt: HandoffReceipt,
  setPhase: (phase: LandingPhase) => void,
  setSummary: (summary: LoginHandoffSummaryResponse) => void,
): void {
  if (receipt.kind === 'expired') {
    setPhase('expired');

    return;
  }

  if (receipt.kind === 'failed') {
    setPhase('failed');

    return;
  }

  setSummary(receipt.summary);
  setPhase('ready');
  track('client_loginContinue_viewed');
  stripHandoffQuery();
}

function ExternalHandoffLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<LandingPhase>('loading');
  const [summary, setSummary] = useState<LoginHandoffSummaryResponse | null>(
    null,
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    if (detectInAppBrowser(navigator.userAgent)) {
      return;
    }

    const code = searchParams.get(HANDOFF_QUERY_PARAM);

    if (!code) {
      router.replace(APP_PATH.LOGIN);

      return;
    }

    void receiveHandoff(code).then((receipt) =>
      applyReceipt(receipt, setPhase, setSummary),
    );
  }, [router, searchParams]);

  if (phase === 'loading') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageLoadingSpinner aria-label="스토리와 채팅을 계정으로 옮기는 중" />
      </div>
    );
  }

  if (phase === 'expired') {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ListStatus title="링크가 만료됐어요" description="다시 로그인해주세요">
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => router.push(APP_PATH.LOGIN)}>
            로그인하러 가기
          </Button>
        </ListStatus>
      </div>
    );
  }

  if (phase === 'failed') {
    const handleRetry = () => {
      const code = searchParams.get(HANDOFF_QUERY_PARAM);

      if (!code) {
        router.replace(APP_PATH.LOGIN);

        return;
      }

      setPhase('loading');
      void receiveHandoff(code).then((receipt) =>
        applyReceipt(receipt, setPhase, setSummary),
      );
    };

    return (
      <div className="flex h-full min-h-0 flex-col">
        <ListStatus
          title="잠시 문제가 생겼어요"
          description="잠시 후 다시 시도해주세요">
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={handleRetry}>
            다시 시도
          </Button>
        </ListStatus>
      </div>
    );
  }

  const handleGoogleLogin = () => {
    track('client_loginContinue_loginButton_clicked');
    void startGoogleLogin({
      redirectTo: resolveLoginCallbackUrl(summary?.callbackPath ?? null),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title="로그인" fallbackHref={APP_PATH.MAIN.STORIES} />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4 pt-0">
        <div className="flex flex-col items-center gap-4">
          <ManyakLogo className="h-6 w-auto text-primary" />
          <p className="text-center text-lg font-semibold">
            로그인하고 나만의 스토리를
            <br />
            어디서든 이어서 즐겨보세요
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-center text-sm leading-relaxed text-foreground-secondary">
            만든 스토리와 채팅은 로그인하면 계정으로 옮겨져요
            <br />이 과정은 계정당 한 번만 진행돼요
          </p>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}>
            <GoogleLogo />
            Google로 시작하기
          </Button>
          <p className="text-center text-xs leading-relaxed text-foreground-secondary">
            로그인 시{' '}
            <Link href={APP_PATH.TERMS} className="underline">
              서비스이용약관
            </Link>{' '}
            및{' '}
            <Link href={APP_PATH.PRIVACY} className="underline">
              개인정보처리방침
            </Link>
            에<br />
            동의하는 것으로 간주해요
          </p>
        </div>
      </main>
    </div>
  );
}

export function LoginContinueScreen() {
  const inAppBrowser = useSyncExternalStore(
    emptySubscribe,
    () => detectInAppBrowser(navigator.userAgent),
    () => null,
  );

  if (inAppBrowser) {
    return <InAppEscapeGuide app={inAppBrowser} />;
  }

  return <ExternalHandoffLanding />;
}
