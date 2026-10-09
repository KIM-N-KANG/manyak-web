'use client';

import { useRef, useState } from 'react';

import Link from 'next/link';

import { useRecordConsents } from '@/api/generated/endpoints/user/user';
import type { UserConsentResponse } from '@/api/generated/models';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Checkbox } from '@/components/motion/checkbox';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { API_ERROR_CODE } from '@/constants/api-error-code';
import { APP_PATH } from '@/constants/app-path';
import type { ConsentGatePhase } from '@/features/auth/_shared/components/consent-gate';
import { CONSENT_SHEET_COPY } from '@/features/auth/_shared/constants/consent';
import {
  buildConsentRequest,
  type ConsentKey,
  hasPendingConsent,
  isEveryRequiredChecked,
  type RequiredConsent,
} from '@/features/auth/_shared/utils/consent-status';
import { signOutBeforeConsent } from '@/features/auth/_shared/utils/sign-out-before-consent';
import { submitSignupConsent } from '@/features/auth/_shared/utils/signup-consent-client';
import {
  hasAskedPushPermission,
  markPushPermissionAsked,
} from '@/features/my/_shared/utils/marketing-consent-storage';
import {
  isIosDevice,
  isStandaloneDisplay,
  readNotificationPermission,
  requestNotificationPermission,
} from '@/features/my/_shared/utils/push-permission';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { useBackLayer } from '@/hooks/use-back-layer';
import { notifySessionExpired } from '@/lib/auth/session-expiry';
import { SIGNUP_CONSENT_ERROR } from '@/lib/auth/signup-consent';
import { FetchError, getApiErrorCode } from '@/lib/custom-fetch';
import { cn } from '@/lib/utils';

type ConsentNotice = keyof typeof CONSENT_SHEET_COPY.error | null;

/**
 * 가입 동의 시트의 결과. 성공(`completed`)이면 새 세션의 회원과 광고 동의 답을 넘기고,
 * 다시 로그인해야 하는 실패(`expired`, `outdated`)와 로그아웃·뒤로가기 취소(`cancelled`)는
 * 게이트가 대기를 비우고 게스트로 돌린다.
 */
export type SignupSettlement =
  | { type: 'completed'; userId: string; marketingAccepted: boolean }
  | { type: 'expired' | 'outdated' | 'cancelled' };

type UseConsentFormOptions = {
  required: RequiredConsent[];
  /** 세션 없이 가입 동의를 받는 모드. 제출은 가입 완료, 뒤로가기는 가입 취소다. */
  isSignup: boolean;
  onRecorded: (
    recorded: UserConsentResponse,
    marketingAccepted: boolean,
  ) => void;
  onSignupSettled: (settlement: SignupSettlement) => void;
  onReload: () => void;
};

/**
 * 필수 동의 제출 직전에 브라우저 알림 권한을 요청한다. 제출 버튼 클릭이 사용자 제스처라
 * 이 시점이 웹에서 권한 팝업을 띄울 수 있는 가장 이른 때다(Android는 앱 시작 때 묻는다).
 * 권한이 미결정이고 이 기기에서 아직 묻지 않았을 때만 한 번 묻고, iOS 비설치본은 권한을
 * 받을 수 없어 건너뛴다. 응답과 무관하게 동의 제출은 이어진다.
 */
async function askPushPermissionBeforeSubmit(): Promise<void> {
  if (
    readNotificationPermission() !== 'default' ||
    hasAskedPushPermission() ||
    (isIosDevice() && !isStandaloneDisplay())
  ) {
    return;
  }

  markPushPermissionAsked();
  await requestNotificationPermission().catch(() => undefined);
}

const DOCUMENT_LINKS: Partial<
  Record<ConsentKey, { href: string; label: string }>
> = {
  terms: { href: APP_PATH.TERMS, label: CONSENT_SHEET_COPY.viewDocument.terms },
  privacy: {
    href: APP_PATH.PRIVACY,
    label: CONSENT_SHEET_COPY.viewDocument.privacy,
  },
};

/**
 * 필수 동의 시트의 체크·제출·로그아웃 상태를 관리하는 훅. 가입 모드에서는 제출이
 * 가입 완료(Credentials)로, 로그아웃이 가입 취소로 바뀐다.
 * 체크 상태는 서버가 요구하는 버전 묶음에 매여 있어, 버전 불일치로 다시 조회해 요구
 * 버전이 바뀌면 체크가 저절로 초기화된다(자동 재전송 없음). 기록 응답에서 필수 항목의
 * `needsConsent`가 모두 false일 때만 완료로 반영한다. 시트가 열린 동안 로그아웃 버튼과 뒤로가기는
 * 동의하지 않은 것으로 보고 `logout`으로 이어진다(제출 중에는 무시).
 *
 * @param options 필요 항목, 기록 성공 반영 콜백, 최신 상태 재조회 콜백
 * @returns 체크 상태·토글·제출·로그아웃 핸들러와 진행·오류 상태
 */
function useConsentForm({
  required,
  isSignup,
  onRecorded,
  onSignupSettled,
  onReload,
}: UseConsentFormOptions) {
  const versionKey = required
    .map(({ key, requiredVersion }) => `${key}:${requiredVersion}`)
    .join(',');
  const [checkedState, setCheckedState] = useState<{
    versionKey: string;
    keys: ReadonlySet<ConsentKey>;
  }>({ versionKey, keys: new Set() });
  const [notice, setNotice] = useState<ConsentNotice>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);
  const [isAskingPermission, setIsAskingPermission] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const checked: ReadonlySet<ConsentKey> =
    checkedState.versionKey === versionKey
      ? checkedState.keys
      : new Set<ConsentKey>();
  const record = useRecordConsents({
    mutation: {
      onSuccess: (response) => {
        if (response.status === 200 && !hasPendingConsent(response.data)) {
          setNotice(null);
          onRecorded(response.data, marketingChecked);

          return;
        }

        setNotice('versionMismatch');
        onReload();
      },
      onError: (error) => {
        if (error instanceof FetchError && error.status === 401) {
          notifySessionExpired();

          return;
        }

        if (error instanceof FetchError && error.status === 403) {
          setNotice('forbidden');

          return;
        }

        if (
          getApiErrorCode(error) === API_ERROR_CODE.CONSENT_VERSION_MISMATCH
        ) {
          setNotice('versionMismatch');
          onReload();

          return;
        }

        setNotice('retryable');
      },
    },
  });

  const setChecked = (keys: ReadonlySet<ConsentKey>) =>
    setCheckedState({ versionKey, keys });

  const toggle = (key: ConsentKey, isChecked: boolean) => {
    const next = new Set(checked);

    if (isChecked) {
      next.add(key);
    } else {
      next.delete(key);
    }

    setChecked(next);
  };

  // 전체 동의는 선택 항목(광고 알림)까지 함께 켜고 끈다(Android와 동일). 제출 조건은 필수만 본다.
  const toggleAll = (isChecked: boolean) => {
    setChecked(isChecked ? new Set(required.map(({ key }) => key)) : new Set());
    setMarketingChecked(isChecked);
  };

  const isLocked =
    record.isPending || isLoggingOut || isAskingPermission || isSigningUp;

  const submitSignup = async () => {
    setIsSigningUp(true);

    const result = await submitSignupConsent(buildConsentRequest(required));

    setIsSigningUp(false);

    if (result.ok) {
      onSignupSettled({
        type: 'completed',
        userId: result.userId,
        marketingAccepted: marketingChecked,
      });

      return;
    }

    if (result.code === SIGNUP_CONSENT_ERROR.RETRYABLE) {
      setNotice('retryable');

      return;
    }

    onSignupSettled({ type: result.code });
  };

  const submit = () => {
    if (isLocked || !isEveryRequiredChecked(required, checked)) {
      return;
    }

    setNotice(null);
    setIsAskingPermission(true);
    void askPushPermissionBeforeSubmit().finally(() => {
      setIsAskingPermission(false);

      if (isSignup) {
        void submitSignup();

        return;
      }

      record.mutate({ data: buildConsentRequest(required) });
    });
  };

  // 로그아웃 버튼과 뒤로가기는 동의하지 않은 것으로 본다. 가입 모드는 세션이 없으므로 가입만 취소한다.
  const logout = () => {
    if (isLocked) {
      return;
    }

    if (isSignup) {
      onSignupSettled({ type: 'cancelled' });

      return;
    }

    setIsLoggingOut(true);
    void signOutBeforeConsent();
  };

  return {
    checked,
    isAllChecked: isEveryRequiredChecked(required, checked) && marketingChecked,
    isEveryRequiredChecked: isEveryRequiredChecked(required, checked),
    notice,
    isSubmitting: record.isPending || isAskingPermission || isSigningUp,
    isLoggingOut,
    isLocked,
    marketingChecked,
    setMarketingChecked,
    toggle,
    toggleAll,
    submit,
    logout,
  };
}

type ConsentSheetProps = {
  phase: ConsentGatePhase;
  required: RequiredConsent[];
  onRecorded: (
    recorded: UserConsentResponse,
    marketingAccepted: boolean,
  ) => void;
  onSignupSettled: (settlement: SignupSettlement) => void;
  onReload: () => void;
};

export function ConsentSheet({
  phase,
  required,
  onRecorded,
  onSignupSettled,
  onReload,
}: ConsentSheetProps) {
  const container = useAppFrameContainer();
  const sheetRef = useRef<HTMLDivElement>(null);
  const isSignup = phase === 'signup-required' || phase === 'signup-load-error';
  const form = useConsentForm({
    required,
    isSignup,
    onRecorded,
    onSignupSettled,
    onReload,
  });
  const isConsentStep = phase === 'required' || phase === 'signup-required';
  const isLoadError = phase === 'load-error' || phase === 'signup-load-error';
  const isOpen = isConsentStep || isLoadError || phase === 'forbidden';

  // 뒤로가기는 닫기가 아니라 가입 취소·로그아웃이라 래퍼의 기본 닫기를 끄고 직접 받는다.
  useBackLayer({ open: isOpen && container !== null, onBack: form.logout });

  const errorHeader = isLoadError
    ? CONSENT_SHEET_COPY.loadError
    : phase === 'forbidden'
      ? CONSENT_SHEET_COPY.forbidden
      : null;

  return (
    <Drawer
      open={isOpen && container !== null}
      closeOnBack={false}
      disablePointerDismissal
      showSwipeHandle={false}
      onOpenChange={() => {}}>
      <DrawerContent
        ref={sheetRef}
        initialFocus={sheetRef}
        container={container}
        data-base-ui-swipe-ignore=""
        aria-busy={form.isLocked}>
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold">
            {errorHeader?.title ?? CONSENT_SHEET_COPY.title}
          </DrawerTitle>
          {errorHeader && (
            <DrawerDescription className="text-base leading-relaxed break-keep">
              {errorHeader.description}
            </DrawerDescription>
          )}
        </DrawerHeader>

        <div className="flex min-h-0 w-full flex-col gap-8 overflow-y-auto overscroll-contain px-4 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {isConsentStep && (
            <div className="flex flex-col gap-2">
              <Checkbox
                className="min-h-12"
                checked={form.isAllChecked}
                disabled={form.isLocked}
                onCheckedChange={form.toggleAll}
                label={
                  <span className="text-base font-semibold">
                    {CONSENT_SHEET_COPY.agreeAll}
                  </span>
                }
              />
              <hr className="border-border" />
              <ul className="flex flex-col gap-2">
                {required.map(({ key }) => (
                  <li key={key} className="flex min-h-12 items-center gap-2">
                    <Checkbox
                      className="min-w-0 flex-1"
                      checked={form.checked.has(key)}
                      disabled={form.isLocked}
                      onCheckedChange={(isChecked) =>
                        form.toggle(key, isChecked)
                      }
                      label={
                        <span className="text-base">
                          {CONSENT_SHEET_COPY.items[key]}
                        </span>
                      }
                    />
                    {DOCUMENT_LINKS[key] && (
                      <Link
                        href={DOCUMENT_LINKS[key].href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={DOCUMENT_LINKS[key].label}
                        className="shrink-0 px-2 py-3 text-xs text-foreground-secondary underline">
                        {CONSENT_SHEET_COPY.viewDocument.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
              <Checkbox
                className="min-h-12"
                checked={form.marketingChecked}
                disabled={form.isLocked}
                onCheckedChange={form.setMarketingChecked}
                label={
                  <span className="flex flex-col gap-1">
                    <span className="text-base">
                      {CONSENT_SHEET_COPY.marketing}
                    </span>
                    <span className="text-xs text-foreground-secondary">
                      {CONSENT_SHEET_COPY.marketingDescription}
                    </span>
                  </span>
                }
              />
            </div>
          )}

          {form.notice && (
            <p role="alert" className="text-sm text-destructive">
              {CONSENT_SHEET_COPY.error[form.notice]}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {isConsentStep && (
              <Button
                type="button"
                size="lg"
                className="relative w-full"
                disabled={!form.isEveryRequiredChecked || form.isLocked}
                onClick={form.submit}>
                <LoadingButtonContent
                  isLoading={form.isSubmitting}
                  loadingLabel={CONSENT_SHEET_COPY.submitPending}>
                  {CONSENT_SHEET_COPY.submit}
                </LoadingButtonContent>
              </Button>
            )}
            {isLoadError && (
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={form.isLocked}
                onClick={onReload}>
                {CONSENT_SHEET_COPY.retry}
              </Button>
            )}
            {isOpen && (
              <Button
                type="button"
                variant={phase === 'forbidden' ? 'outline' : 'ghost'}
                size="lg"
                className={cn(
                  'relative w-full',
                  phase !== 'forbidden' && 'text-foreground-secondary',
                )}
                disabled={form.isLocked}
                onClick={form.logout}>
                <LoadingButtonContent
                  isLoading={form.isLoggingOut}
                  loadingLabel={CONSENT_SHEET_COPY.logoutPending}>
                  {CONSENT_SHEET_COPY.logout}
                </LoadingButtonContent>
              </Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
