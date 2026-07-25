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
 * 핸드오프 코드를 BFF(/api/auth/handoff-session)에 제출해 HttpOnly 쿠키로 옮긴다.
 * 코드는 body로만 보내고 응답은 안내용 요약만 받는다. 만료·무효(non-2xx)면 null을 반환한다.
 *
 * @param code URL 쿼리에서 읽은 핸드오프 코드
 * @returns 옮길 건수·복귀 경로 요약(실패 시 null)
 */
async function submitHandoffSession(
  code: string,
): Promise<LoginHandoffSummaryResponse | null> {
  const response = await fetch(HANDOFF_SESSION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as LoginHandoffSummaryResponse;
}

/**
 * 외부 브라우저에서 핸드오프를 수령하고, 성공 시 온보딩 완료를 마킹한다.
 * 핸드오프 유입 사용자는 인앱에서 이미 체험했으므로, 로그인 취소 후 게스트 진입·로그아웃
 * 후 재방문에서 온보딩이 다시 뜨지 않게 한다(스펙 §3-10 흐름 5의 곁가지 경로 보정).
 *
 * @param code URL 쿼리에서 읽은 핸드오프 코드
 * @returns 안내용 요약(만료·무효면 null)
 */
async function receiveHandoff(
  code: string,
): Promise<LoginHandoffSummaryResponse | null> {
  const summary = await submitHandoffSession(code);

  if (!summary) {
    return null;
  }

  markOnboardingSeen();

  return summary;
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

function ExternalHandoffLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'expired'>(
    'loading',
  );
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

    const code = searchParams.get('handoff');

    if (!code) {
      router.replace(APP_PATH.LOGIN);

      return;
    }

    void receiveHandoff(code).then((result) => {
      if (!result) {
        setPhase('expired');

        return;
      }

      setSummary(result);
      setPhase('ready');
      track('client_loginContinue_viewed');
      stripHandoffQuery();
    });
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
