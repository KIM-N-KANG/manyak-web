# Invite Code Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace invite-link attribution with invite-code sharing and redemption on `/my/invite`, plus a one-time new-user invite-code `AlertDialog`.

**Architecture:** A shared invite-code form and mutation hook own normalization, API calls, feedback, analytics, and balance refresh. The invite page supplies code sharing and monthly progress, while NextAuth carries a server-provided new-user flag into a dismissible onboarding dialog. Legacy route/cookie/login invite wiring is removed rather than kept as a fallback.

**Tech Stack:** Next.js 16 App Router, React 19, NextAuth 5 beta, TanStack Query 5, Orval-generated hooks, Base UI/shadcn components, Tailwind CSS 4, Vitest, Playwright.

## Global Constraints

- Do not edit `src/api/generated/**`; use `useGetMyInvite`, `useRedeemInviteCode`, `getMeQueryKey`, and generated models as-is.
- A successful code submitter receives 500 credits. The KST monthly 10-use cap applies only to rewards earned when other users submit the inviter's code.
- Kakao description must be exactly `로그인하고 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요.` and its button must be exactly `마냑 하러가기`.
- New-user invite entry must use `AlertDialog`, not a route.
- Remove `/invite/[code]`, the invite cookie, login `inviteCode`, and `APP_PATH.INVITE` without compatibility redirect.
- Keep the redeem form visible on `/my/invite`; the API has no preflight “already redeemed” field.
- Do not implement in-app-browser escape/detection in this plan.
- Use semantic Tailwind tokens, `cn()` for conditional classes, and mobile-first layout.
- Do not use `useMemo` or `useCallback`; React Compiler is enabled.
- A form submit handler uses `SubmitEvent<HTMLFormElement>`.
- Use analytics and monitoring wrappers, never direct Amplitude/Sentry imports.
- Commit after every task with `[KNK-566]` and do not push.

## File Map

### Create

- `src/features/my/invite/utils/invite-code.ts`: normalization and runtime error mapping.
- `src/features/my/invite/hooks/use-redeem-invite-code.ts`: generated mutation adapter, analytics, toast, and cache refresh.
- `src/features/my/invite/components/invite-code-form.tsx`: reusable accessible form.
- `src/features/my/invite/components/invite-onboarding-dialog.tsx`: new-user `AlertDialog`.
- `tests/features/my/invite/utils/invite-code.test.ts`: pure domain tests.

### Modify

- `src/observability/analytics/events.ts`: invite input/onboarding event types.
- `src/constants/toast-message.ts`: code-copy and redeem feedback.
- `src/features/my/invite/components/invite-screen.tsx`: code-first page and form composition.
- `src/features/my/invite/hooks/use-kakao-share.ts`: code text and home URL sharing.
- `src/lib/auth/backend-client.ts`: login request is `{idToken}` only.
- `src/lib/auth/backend-session.ts`: remove invite cookie and return new-user state.
- `src/lib/auth/auth.ts`: JWT/session pending flag and false-only update.
- `src/lib/auth/next-auth.d.ts`: pending flag augmentation.
- `src/app/layout.tsx`: mount the invite onboarding dialog.
- `src/features/onboarding/hooks/use-onboarding-dialog.ts`: general welcome dialog is guest-only.
- `src/constants/app-path.ts`: remove legacy invite route builder.
- `tests/lib/auth/backend-client.test.ts`: assert login body has no invite code.
- `tests/lib/auth/backend-session.test.ts`: assert new-user propagation and remove cookie cases.
- `e2e/fixtures/auth.ts`: stateful pending-session mock.
- `e2e/my/invite.spec.ts`: code sharing, redemption, errors, and onboarding.
- `knk-harness/docs/product-specs/0-glossary.md`: inviter-only monthly cap wording.
- `knk-harness/docs/product-specs/1-background.md`: inviter-only monthly cap wording.
- `knk-harness/docs/product-specs/4-backend.md`: acceptance wording.
- `knk-harness/docs/product-specs/6-analytics.md`: analytics description wording.

### Delete

- `src/app/invite/[code]/route.ts`
- `src/lib/auth/invite-cookie.ts`
- `tests/app/invite-route.test.ts`
- `tests/lib/auth/invite-cookie.test.ts`

## Task 1: Shared Invite-Code Domain and Form

**Files:**

- Create: `src/features/my/invite/utils/invite-code.ts`
- Create: `src/features/my/invite/hooks/use-redeem-invite-code.ts`
- Create: `src/features/my/invite/components/invite-code-form.tsx`
- Create: `tests/features/my/invite/utils/invite-code.test.ts`
- Modify: `src/observability/analytics/events.ts`
- Modify: `src/constants/toast-message.ts`

**Interfaces:**

- Produces: `InviteCodeSource`, `InviteCodeErrorType`, `normalizeInviteCode(value)`, `resolveInviteCodeError(error)`.
- Produces: `useRedeemInviteCode({source, onSuccess})` returning `redeemInviteCode`, `isRedeeming`, `errorMessage`, `clearError`.
- Produces: `<InviteCodeForm source onSuccess? onPendingChange? autoFocus? />` for Tasks 2 and 4.

- [ ] **Step 1: Write failing normalization and error-mapping tests**

Create `tests/features/my/invite/utils/invite-code.test.ts` with cases that require the wished-for API:

```ts
import { describe, expect, it } from 'vitest';

import { FetchError } from '@/lib/api-error';
import {
  normalizeInviteCode,
  resolveInviteCodeError,
} from '@/features/my/invite/utils/invite-code';

describe('normalizeInviteCode', () => {
  it('앞뒤 공백을 제거하고 대문자로 변환한다', () => {
    expect(normalizeInviteCode('  cw6vzx7d  ')).toBe('CW6VZX7D');
  });

  it('공백뿐인 값은 빈 문자열이 된다', () => {
    expect(normalizeInviteCode('   ')).toBe('');
  });
});

describe('resolveInviteCodeError', () => {
  it.each([
    [new FetchError('bad', 400, { code: 'BAD_REQUEST' }), 'not_found', '코드를 다시 확인해 주세요'],
    [new FetchError('missing', 404, { code: 'NOT_FOUND' }), 'not_found', '코드를 다시 확인해 주세요'],
    [new FetchError('self', 409, { code: 'INVITE_SELF_CODE' }), 'self_code', '내 코드는 입력할 수 없어요'],
    [new FetchError('used', 409, { code: 'INVITE_ALREADY_REDEEMED' }), 'already_redeemed', '이미 초대 코드를 입력했어요'],
  ] as const)('API 오류를 사용자 문구와 분석 사유로 변환한다', (error, errorType, message) => {
    expect(resolveInviteCodeError(error)).toEqual({ errorType, message });
  });

  it('알 수 없는 오류는 network로 분류한다', () => {
    expect(resolveInviteCodeError(new Error('offline'))).toEqual({
      errorType: 'network',
      message: '초대 코드 입력에 실패했어요. 잠시 후 다시 시도해 주세요',
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm exec vitest run tests/features/my/invite/utils/invite-code.test.ts
```

Expected: FAIL because `@/features/my/invite/utils/invite-code` does not exist.

- [ ] **Step 3: Implement the pure domain module**

Create `src/features/my/invite/utils/invite-code.ts` with these exact exports and mapping:

```ts
import { FetchError, getApiErrorCode } from '@/lib/api-error';

export type InviteCodeSource = 'invite_page' | 'onboarding';
export type InviteCodeErrorType =
  | 'not_found'
  | 'self_code'
  | 'already_redeemed'
  | 'network';

export type InviteCodeError = {
  errorType: InviteCodeErrorType;
  message: string;
};

export const normalizeInviteCode = (value: string): string =>
  value.trim().toUpperCase();

export function resolveInviteCodeError(error: unknown): InviteCodeError {
  if (error instanceof FetchError) {
    if (error.status === 400 || error.status === 404) {
      return { errorType: 'not_found', message: '코드를 다시 확인해 주세요' };
    }

    if (error.status === 409) {
      const code = getApiErrorCode(error);

      if (code === 'INVITE_SELF_CODE') {
        return { errorType: 'self_code', message: '내 코드는 입력할 수 없어요' };
      }

      if (code === 'INVITE_ALREADY_REDEEMED') {
        return {
          errorType: 'already_redeemed',
          message: '이미 초대 코드를 입력했어요',
        };
      }
    }
  }

  return {
    errorType: 'network',
    message: '초대 코드 입력에 실패했어요. 잠시 후 다시 시도해 주세요',
  };
}
```

- [ ] **Step 4: Run the domain test and verify GREEN**

Run the Step 2 command. Expected: all tests in the file PASS.

- [ ] **Step 5: Add typed analytics and toast contracts**

Add these entries under the invite section in `events.ts`:

```ts
client_invite_codeInput_submitted: { source: InviteCodeSource };
client_invite_codeInput_succeeded: { source: InviteCodeSource };
client_invite_codeInput_failed: {
  source: InviteCodeSource;
  error_type: InviteCodeErrorType;
};
client_inviteOnboarding_shown: void;
client_inviteOnboarding_skipped: void;
```

Import `InviteCodeSource` and `InviteCodeErrorType` with an inline type import from the concrete utility path. Replace invite-link toast constants with:

```ts
INVITE_CODE_COPIED: '초대 코드를 복사했어요',
INVITE_CODE_COPY_FAILED: '초대 코드 복사에 실패했어요',
INVITE_REDEEMED: '크레딧 500개를 받았어요',
INVITE_SHARE_FAILED: '카카오톡 공유를 열지 못했어요',
```

- [ ] **Step 6: Implement the mutation adapter**

Create `use-redeem-invite-code.ts`. It must normalize before submission, avoid an API call for an empty value, track with the supplied source, use `resolveInviteCodeError` on rejection, show the fixed success toast, and invalidate `getMeQueryKey()`:

```ts
'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getMeQueryKey } from '@/api/generated/endpoints/auth/auth';
import { useRedeemInviteCode as useRedeemInviteCodeMutation } from '@/api/generated/endpoints/invite/invite';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import {
  normalizeInviteCode,
  resolveInviteCodeError,
  type InviteCodeSource,
} from '../utils/invite-code';

export function useRedeemInviteCode({
  source,
  onSuccess,
}: {
  source: InviteCodeSource;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useRedeemInviteCodeMutation({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 200) return;
        setErrorMessage(null);
        track('client_invite_codeInput_succeeded', { source });
        toast.success(TOAST_MESSAGE.INVITE_REDEEMED);
        void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
        onSuccess?.();
      },
      onError: (error) => {
        const resolved = resolveInviteCodeError(error);
        setErrorMessage(resolved.message);
        track('client_invite_codeInput_failed', {
          source,
          error_type: resolved.errorType,
        });
      },
    },
  });

  const redeemInviteCode = (value: string): boolean => {
    const code = normalizeInviteCode(value);
    if (!code) {
      setErrorMessage('코드를 입력해 주세요');
      return false;
    }

    setErrorMessage(null);
    track('client_invite_codeInput_submitted', { source });
    mutation.mutate({ data: { code } });
    return true;
  };

  return {
    redeemInviteCode,
    isRedeeming: mutation.isPending,
    errorMessage,
    clearError: () => setErrorMessage(null),
  };
}
```

- [ ] **Step 7: Implement the reusable form**

Create `invite-code-form.tsx` with a controlled uppercase input, `FieldError`, and a full-width submit button. On successful request start keep the entered code; on `onSuccess` clear it. Pass `source`, `onSuccess`, and optional `autoFocus` through the public props. Use `SubmitEvent<HTMLFormElement>`, `aria-invalid`, `aria-busy`, `autoCapitalize="characters"`, `autoComplete="off"`, and `spellCheck={false}`. Give the input and button `h-12`/`size="lg"` so both touch targets are 48px high.

```tsx
'use client';

import { useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { useRedeemInviteCode } from '../hooks/use-redeem-invite-code';
import { type InviteCodeSource } from '../utils/invite-code';

export function InviteCodeForm({
  source,
  onSuccess,
  onPendingChange,
  autoFocus = false,
}: {
  source: InviteCodeSource;
  onSuccess?: () => void;
  onPendingChange?: (pending: boolean) => void;
  autoFocus?: boolean;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [code, setCode] = useState('');
  const { redeemInviteCode, isRedeeming, errorMessage, clearError } =
    useRedeemInviteCode({
      source,
      onSuccess: () => {
        setCode('');
        onSuccess?.();
      },
    });

  useEffect(() => {
    onPendingChange?.(isRedeeming);
  }, [isRedeeming, onPendingChange]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    redeemInviteCode(code);
  };

  return (
    <form
      className="flex w-full flex-col gap-3"
      aria-busy={isRedeeming}
      onSubmit={handleSubmit}>
      <Field data-invalid={Boolean(errorMessage)}>
        <FieldLabel htmlFor={inputId}>친구 초대 코드</FieldLabel>
        <Input
          id={inputId}
          className="h-12 uppercase"
          value={code}
          disabled={isRedeeming}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
          autoFocus={autoFocus}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="초대 코드를 입력해 주세요"
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            clearError();
          }}
        />
        <FieldError id={errorId}>{errorMessage}</FieldError>
      </Field>
      <Button
        className="w-full"
        type="submit"
        size="lg"
        disabled={isRedeeming}>
        {isRedeeming ? '입력 중...' : '500 크레딧 받기'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 8: Verify and commit Task 1**

Run:

```bash
pnpm exec vitest run tests/features/my/invite/utils/invite-code.test.ts
pnpm typecheck
pnpm lint
```

Expected: domain tests, typecheck, and lint PASS after the form and hook compile.

Commit only Task 1 paths:

```bash
git commit -m "[KNK-566] Feat: 초대 코드 입력 공통 폼 추가"
```

## Task 2: Invite Page, Code Copy, and Kakao Sharing

**Files:**

- Modify: `src/features/my/invite/components/invite-screen.tsx`
- Modify: `src/features/my/invite/hooks/use-kakao-share.ts`
- Modify: `e2e/my/invite.spec.ts`

**Interfaces:**

- Consumes: `<InviteCodeForm source="invite_page" />` from Task 1.
- Produces: `shareInviteCode(code: string)` and the completed `/my/invite` page.

- [ ] **Step 1: Rewrite page E2E expectations before production code**

Update the invite API mock to return:

```ts
{
  inviteCode: 'CW6VZX7D',
  monthlyRewardCount: 3,
  monthlyRewardLimit: 10,
}
```

Replace link-route/link-copy cases with these observable requirements:

- `내 초대 코드`, `CW6VZX7D`, and `이번 달 3/10회` are visible.
- `코드 복사하기` copies `CW6VZX7D` and shows `초대 코드를 복사했어요`.
- `친구 초대 코드` input and `500 크레딧 받기` button are visible.
- A redeem route captures JSON and verifies `  cw6vzx7d  ` becomes `{code: 'CW6VZX7D'}`; 200 shows the success toast.
- The Kakao SDK stub saves `sendDefault(settings)` to `window.__kakaoShareSettings`; clicking share yields title containing the code, the exact description and button label, and both URLs equal `${origin}/`.
- A 500 GET response and a 200 response without `inviteCode` both keep the received-code form usable while showing `초대 코드를 불러오지 못했어요` and a `다시 시도` button in the code panel.

- [ ] **Step 2: Run targeted E2E and verify RED**

Run:

```bash
pnpm exec playwright test e2e/my/invite.spec.ts
```

Expected: FAIL on old link labels, missing monthly progress/form, and the existing `inviteUrl` type/build error.

- [ ] **Step 3: Convert Kakao sharing to code-first payload**

Change the hook interface to `shareInviteCode(inviteCode: string)`. Build the home link with `new URL(APP_PATH.MAIN.STORIES, window.location.origin).toString()`. Send:

```ts
content: {
  title: `초대 코드 ${inviteCode}`,
  description: '로그인하고 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요.',
  imageUrl: shareImageUrl(),
  link,
},
buttons: [{ title: '마냑 하러가기', link }],
```

Import `APP_PATH`; do not construct `/invite/${code}`.

```ts
'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';

export const KAKAO_SDK_URL =
  'https://t1.kakaocdn.net/kakao_js_sdk/2.7.7/kakao.min.js';

const KAKAO_SHARE_DESCRIPTION =
  '로그인하고 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요.';

const shareImageUrl = (): string =>
  `${window.location.origin}/opengraph-image.png`;

type KakaoShareLink = { mobileWebUrl: string; webUrl: string };
type KakaoSdk = {
  isInitialized: () => boolean;
  init: (appKey: string) => void;
  Share: {
    sendDefault: (settings: {
      objectType: 'feed';
      content: {
        title: string;
        description?: string;
        imageUrl: string;
        link: KakaoShareLink;
      };
      buttons?: { title: string; link: KakaoShareLink }[];
    }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export function useKakaoShare() {
  const [isReady, setIsReady] = useState(false);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  const handleSdkLoad = () => {
    if (!appKey || !window.Kakao) return;
    if (!window.Kakao.isInitialized()) window.Kakao.init(appKey);
    setIsReady(true);
  };

  const shareInviteCode = (inviteCode: string) => {
    if (!window.Kakao?.isInitialized()) {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);
      return;
    }

    const homeUrl = new URL(
      APP_PATH.MAIN.STORIES,
      window.location.origin,
    ).toString();
    const link = { mobileWebUrl: homeUrl, webUrl: homeUrl };

    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `초대 코드 ${inviteCode}`,
          description: KAKAO_SHARE_DESCRIPTION,
          imageUrl: shareImageUrl(),
          link,
        },
        buttons: [{ title: '마냑 하러가기', link }],
      });
    } catch {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);
    }
  };

  return { isReady, handleSdkLoad, shareInviteCode };
}
```

- [ ] **Step 4: Rebuild the invite screen**

Remove all `inviteUrl` references and 24-hour/link copy. Use `invite?.inviteCode` for copy and share. Destructure query pending/error/refetch state, show a code-panel error with a retry button, and keep the redeem form outside that state branch. Show monthly progress only when both values are numbers. Track `client_invite_viewed` only after `status === 'authenticated'`. Compose `<InviteCodeForm source="invite_page" />` in a dedicated section. Use these guide meanings:

- 친구가 내 초대 코드를 입력하면 양쪽에 500 크레딧
- 내 코드로 받는 보상은 KST 월 기준 응답 limit까지
- 받은 코드는 계정당 평생 한 번 입력
- 보상 크레딧은 30일 유효
- 이벤트 변경·종료 가능

The screen implementation must preserve the existing authentication redirect and SDK loading while following this structure:

```tsx
'use client';

import { useEffect } from 'react';
import { CopyLinkIcon, Share08Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useGetMyInvite } from '@/api/generated/endpoints/invite/invite';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import { KAKAO_SDK_URL, useKakaoShare } from '../hooks/use-kakao-share';
import { InviteCodeForm } from './invite-code-form';

const GUIDE_LINES = [
  '친구가 내 초대 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요.',
  '내 코드로 받는 보상은 한국 시간 기준 매월 정해진 횟수까지 받을 수 있어요.',
  '받은 초대 코드는 계정당 평생 한 번 입력할 수 있어요.',
  '보상으로 받은 크레딧은 적립일부터 30일 동안 사용할 수 있어요.',
  '본 이벤트는 사전 고지 없이 변경되거나 종료될 수 있어요.',
];

export function InviteScreen() {
  const { status } = useSession();
  const router = useRouter();
  const { isReady, handleSdkLoad, shareInviteCode } = useKakaoShare();
  const { data, isPending, isError, refetch } = useGetMyInvite({
    query: { refetchOnMount: 'always', enabled: status === 'authenticated' },
  });
  const invite = data?.status === 200 ? data.data : undefined;
  const inviteCode = invite?.inviteCode;
  const isInviteUnavailable = isError || (!isPending && !inviteCode);
  const hasMonthlyProgress =
    typeof invite?.monthlyRewardCount === 'number' &&
    typeof invite.monthlyRewardLimit === 'number';

  useEffect(() => {
    if (status === 'unauthenticated') router.replace(APP_PATH.LOGIN);
    if (status === 'authenticated') track('client_invite_viewed');
  }, [status, router]);

  const handleCopy = () => {
    track('client_invite_copyButton_clicked');
    if (!inviteCode) {
      toast.error(TOAST_MESSAGE.INVITE_CODE_COPY_FAILED);
      return;
    }
    navigator.clipboard
      .writeText(inviteCode)
      .then(() => toast.success(TOAST_MESSAGE.INVITE_CODE_COPIED))
      .catch(() => toast.error(TOAST_MESSAGE.INVITE_CODE_COPY_FAILED));
  };

  const handleKakaoShare = () => {
    track('client_invite_kakaoShareButton_clicked');
    if (!inviteCode) {
      toast.error(TOAST_MESSAGE.INVITE_SHARE_FAILED);
      return;
    }
    shareInviteCode(inviteCode);
  };

  return (
    <div className="flex flex-1 flex-col">
      <Script src={KAKAO_SDK_URL} strategy="lazyOnload" onReady={handleSdkLoad} />
      <header className="flex flex-col gap-1 p-4">
        <h1 className="text-xl font-semibold">친구를 초대하고<br />함께 크레딧을 받아보세요</h1>
        <p className="text-foreground-secondary">
          친구가 내 초대 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요
        </p>
      </header>
      <section className="flex flex-col gap-4 p-4">
        <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg bg-muted p-4">
          <span className="text-sm text-foreground-secondary">내 초대 코드</span>
          {isPending ? <Skeleton className="h-7 w-32 bg-foreground/5" /> : null}
          {!isPending && !isInviteUnavailable ? (
            <span className="text-xl font-bold tracking-widest tabular-nums">{inviteCode}</span>
          ) : null}
          {isInviteUnavailable ? (
            <>
              <p className="text-sm text-foreground-secondary">초대 코드를 불러오지 못했어요</p>
              <Button type="button" size="sm" variant="secondary" onClick={() => void refetch()}>
                다시 시도
              </Button>
            </>
          ) : null}
          {hasMonthlyProgress ? (
            <p className="text-sm text-foreground-secondary">
              이번 달 {invite.monthlyRewardCount}/{invite.monthlyRewardLimit}회
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" size="lg" variant="outline" className="flex-1" disabled={!inviteCode} onClick={handleCopy}>
            <HugeiconsIcon icon={CopyLinkIcon} aria-hidden="true" />코드 복사하기
          </Button>
          <Button type="button" size="lg" className="flex-1" disabled={!inviteCode || !isReady} onClick={handleKakaoShare}>
            <HugeiconsIcon icon={Share08Icon} aria-hidden="true" />카카오톡 공유하기
          </Button>
        </div>
      </section>
      <section className="flex flex-col gap-3 p-4">
        <div><h2 className="text-lg font-bold">받은 초대 코드가 있나요?</h2><p className="text-sm text-foreground-secondary">친구에게 받은 코드를 입력하고 500 크레딧을 받으세요.</p></div>
        <InviteCodeForm source="invite_page" />
      </section>
      <section className="flex flex-col gap-2 p-4">
        <h2 className="text-lg font-bold">이용 안내</h2>
        <ul className="flex list-disc flex-col pl-5 text-sm leading-normal">
          {GUIDE_LINES.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Add reason-specific E2E failures**

For 404 `{code:'NOT_FOUND'}`, 409 `{code:'INVITE_SELF_CODE'}`, and 409 `{code:'INVITE_ALREADY_REDEEMED'}`, assert the three exact messages from the design. Register each mock before navigation and submit through the real form.

- [ ] **Step 6: Verify and commit Task 2**

Run:

```bash
pnpm exec playwright test e2e/my/invite.spec.ts
pnpm typecheck
pnpm lint
```

Expected: invite E2E, typecheck, and lint PASS.

Commit:

```bash
git commit -m "[KNK-566] Feat: 친구 초대를 코드 입력 방식으로 전환"
```

## Task 3: Auth New-User Contract and Legacy Attribution Removal

**Files:**

- Modify: `tests/lib/auth/backend-client.test.ts`
- Modify: `tests/lib/auth/backend-session.test.ts`
- Modify: `src/lib/auth/backend-client.ts`
- Modify: `src/lib/auth/backend-session.ts`
- Modify: `src/lib/auth/auth.ts`
- Modify: `src/lib/auth/next-auth.d.ts`
- Modify: `src/constants/app-path.ts`
- Delete: `src/app/invite/[code]/route.ts`
- Delete: `src/lib/auth/invite-cookie.ts`
- Delete: `tests/app/invite-route.test.ts`
- Delete: `tests/lib/auth/invite-cookie.test.ts`

**Interfaces:**

- Produces: `loginWithGoogleOnServer(idToken: string)`.
- Produces: `establishBackendSession()` result with `isNewUser: boolean`.
- Produces: `Session.inviteOnboardingPending: boolean` and `JWT.inviteOnboardingPending?: boolean`.

- [ ] **Step 1: Change auth tests first**

Delete invite-cookie mocks and cookie-preservation cases. Change the login request test to assert the only body is `{idToken:'id-token'}`. In the main `establishBackendSession` success case, return `newUser: true` from `loginWithGoogleOnServer` and expect:

```ts
{
  userId: 'user-1',
  nickname: '만냐',
  profileImageUrl: 'https://example.com/a.png',
  isNewUser: true,
}
```

Add a case where missing `newUser` produces `isNewUser: false`.

- [ ] **Step 2: Run auth tests and verify RED**

Run:

```bash
pnpm exec vitest run tests/lib/auth/backend-client.test.ts tests/lib/auth/backend-session.test.ts
```

Expected: FAIL because old signatures still accept/forward invite codes and the session result lacks `isNewUser`.

- [ ] **Step 3: Remove invite code from server login**

Implement:

```ts
export const loginWithGoogleOnServer = (
  idToken: string,
): Promise<TokenResponse> =>
  postJson<TokenResponse>(getLoginWithGoogleUrl(), { idToken });
```

In `establishBackendSession`, remove all invite-cookie imports/reads/clears, call login with only `idToken`, and return `isNewUser: tokens.newUser === true`.

- [ ] **Step 4: Carry a false-only pending flag through NextAuth**

Augment both NextAuth/Core `Session` declarations with `inviteOnboardingPending: boolean` and both JWT declarations with `inviteOnboardingPending?: boolean`.

In `jwt` callback, before the `!account` return, accept only this update:

```ts
if (
  trigger === 'update' &&
  session?.inviteOnboardingPending === false
) {
  token.inviteOnboardingPending = false;
}
```

On initial login set `token.inviteOnboardingPending = profile.isNewUser`. In the session callback set `session.inviteOnboardingPending = token.inviteOnboardingPending === true`.

- [ ] **Step 5: Delete legacy files and route constant**

Delete the four listed files and remove `APP_PATH.INVITE`. Verify no runtime reference remains:

```bash
rg -n "invite-cookie|InviteCodeCookie|APP_PATH\.INVITE|/invite/\[code\]|inviteCode\?" src tests e2e
```

Expected: no legacy attribution matches. Generated `inviteCode` response/request fields and the new UI remain valid matches when searching the broader word alone.

- [ ] **Step 6: Verify and commit Task 3**

Run the Step 2 tests plus:

```bash
pnpm typecheck
pnpm lint
```

Expected: all PASS.

Commit:

```bash
git commit -m "[KNK-566] Refactor: 초대 링크 로그인 연결 제거"
```

## Task 4: New-User Invite AlertDialog

**Files:**

- Create: `src/features/my/invite/components/invite-onboarding-dialog.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/features/onboarding/hooks/use-onboarding-dialog.ts`
- Modify: `e2e/fixtures/auth.ts`
- Modify: `e2e/my/invite.spec.ts`

**Interfaces:**

- Consumes: `Session.inviteOnboardingPending` from Task 3.
- Consumes: `<InviteCodeForm source="onboarding" onSuccess={...} />` from Task 1.

- [ ] **Step 1: Extend the member-session E2E fixture and write RED scenarios**

Add `inviteOnboardingPending?: boolean` to `MemberSessionOptions`. The route mock owns a mutable pending boolean. For GET it returns the current value. For POST it reads `postDataJSON().data.inviteOnboardingPending`; when false, it updates the closure before returning the session JSON.

```ts
type MemberSessionOptions = {
  userId?: string;
  nickname?: string;
  profileImageUrl?: string | null;
  inviteOnboardingPending?: boolean;
};

export async function mockMemberSession(
  page: Page,
  {
    userId = 'user-1',
    nickname = '배고픈 송아지',
    profileImageUrl = null,
    inviteOnboardingPending = false,
  }: MemberSessionOptions = {},
): Promise<void> {
  let pending = inviteOnboardingPending;

  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as {
        data?: { inviteOnboardingPending?: boolean };
      };

      if (body.data?.inviteOnboardingPending === false) {
        pending = false;
      }
    }

    await route.fulfill({
      json: {
        user: { id: userId, name: nickname, image: profileImageUrl },
        expires: '2099-01-01T00:00:00.000Z',
        inviteOnboardingPending: pending,
      },
    });
  });
}
```

Add E2E scenarios:

- pending true shows an alert dialog titled `초대 코드가 있나요?` with the form and `나중에 입력하기`.
- clicking skip closes it; reloading does not reopen it.
- submitting a successful code closes it and shows `크레딧 500개를 받았어요`.
- the existing general onboarding title is not visible while the member invite dialog is active.
- pressing Escape or clicking the overlay does not close the pending dialog.
- an invalid submit sets `aria-invalid="true"` and exposes the message through `role="alert"`.

- [ ] **Step 2: Run targeted E2E and verify RED**

Run:

```bash
pnpm exec playwright test e2e/my/invite.spec.ts
```

Expected: FAIL because the dialog is not mounted and session pending is unused.

- [ ] **Step 3: Implement the controlled AlertDialog**

Create a client component that reads `{data: session, status, update}` from `useSession`. Its open condition is authenticated, pending true, and not optimistically dismissed. Track `client_inviteOnboarding_shown` in an effect when open becomes true. Keep the root controlled without accepting false changes from Escape or overlay clicks; only the two explicit actions consume the pending flag.

Use exact structure:

- `AlertDialogContent size="sm"`
- title `초대 코드가 있나요?`
- description `친구에게 받은 초대 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요.`
- `<InviteCodeForm source="onboarding" autoFocus onSuccess={complete} />`
- `AlertDialogCancel` labeled `나중에 입력하기`

`complete()` sets local dismissed true and calls `void update({inviteOnboardingPending:false})`. Skip tracks `client_inviteOnboarding_skipped` before `complete()`.

```tsx
'use client';

import { useEffect, useState } from 'react';

import { useSession } from 'next-auth/react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { track } from '@/observability/analytics';

import { InviteCodeForm } from './invite-code-form';

export function InviteOnboardingDialog() {
  const { data: session, status, update } = useSession();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOpen =
    status === 'authenticated' &&
    session?.inviteOnboardingPending === true &&
    !isDismissed;

  useEffect(() => {
    if (isOpen) {
      track('client_inviteOnboarding_shown');
    }
  }, [isOpen]);

  const complete = () => {
    setIsDismissed(true);
    void update({ inviteOnboardingPending: false });
  };

  const handleSkip = () => {
    track('client_inviteOnboarding_skipped');
    complete();
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>초대 코드가 있나요?</AlertDialogTitle>
          <AlertDialogDescription>
            친구에게 받은 초대 코드를 입력하면 나와 친구 모두 500 크레딧을
            받아요.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <InviteCodeForm
          source="onboarding"
          autoFocus
          onPendingChange={setIsSubmitting}
          onSuccess={complete}
        />
        <AlertDialogFooter className="grid-cols-1">
          <AlertDialogCancel
            className="h-12 w-full"
            size="lg"
            disabled={isSubmitting}
            onClick={handleSkip}>
            나중에 입력하기
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 4: Mount globally and prevent dialog overlap**

Mount `<InviteOnboardingDialog />` inside the root providers next to `AutoMigration`. In `useOnboardingDialog`, read `useSession().status` and require `status === 'unauthenticated'` before scheduling the existing visitor onboarding dialog.

- [ ] **Step 5: Verify and commit Task 4**

Run:

```bash
pnpm exec playwright test e2e/my/invite.spec.ts
pnpm typecheck
pnpm lint
pnpm test
```

Expected: all targeted E2E and the full unit suite PASS without overlapping dialog text.

Commit:

```bash
git commit -m "[KNK-566] Feat: 신규 가입 초대 코드 다이얼로그 추가"
```

## Task 5: Product-Spec Alignment and Final Verification

**Files:**

- Modify in `knk-harness`: `docs/product-specs/0-glossary.md`
- Modify in `knk-harness`: `docs/product-specs/1-background.md`
- Modify in `knk-harness`: `docs/product-specs/4-backend.md`
- Modify in `knk-harness`: `docs/product-specs/6-analytics.md`

**Interfaces:** None. This task makes the written policy match the already approved inviter-only cap.

- [ ] **Step 1: Replace ambiguous monthly-cap wording**

Use wording that says the cap applies to rewards a user earns when other members submit that user's code. Do not say all invite-reward recipients have a monthly cap. Keep the independent 500-credit submitter success rule in `4-backend.md` acceptance criteria.

Apply these exact semantic replacements:

```text
0-glossary.md 적립: 초대자 보상은 다른 회원이 내 코드를 입력한 건에 대해 KST 월 10회까지만 적립한다.
0-glossary.md 초대 코드: 계정당 평생 1회 입력, 다른 회원이 내 코드를 입력해 내가 받는 초대자 보상은 KST 월 10회 상한.
1-background.md: 회원가입 500 · 초대 양쪽 500(초대자 월 10회) · 출석체크 250.
4-backend.md 검수: 초대자의 KST 월 수령 횟수가 10회를 넘으면 초대자 적립만 건너뛰고 입력자는 500을 적립한다.
6-analytics.md: 가입 500 · 초대 500(초대자 월 10회) · 출석 250.
```

- [ ] **Step 2: Verify and commit the harness documentation**

Run in `knk-harness`:

```bash
rg -n "보상 수령 계정별|초대 500, 계정별 월 10회" docs/product-specs
git diff --check
```

Expected: no ambiguous phrase remains in the edited policy locations; diff check passes.

Commit only the four documents:

```bash
git commit -m "[KNK-566] Docs: 초대자 월 보상 상한 기준 명확화"
```

- [ ] **Step 3: Run the final web verification gate**

Run in `manyak-web`:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright test e2e/my/invite.spec.ts
git diff --check
git status --short
```

Expected: all commands exit 0 and the web working tree is clean.

- [ ] **Step 4: Audit every design requirement**

Confirm from code/tests that code copy, Kakao exact copy/CTA/home URL, monthly progress, normalized redeem, three reason-specific failures, balance invalidation, new-user pending lifecycle, skip behavior, analytics, old-flow absence, and no generated-file edits are all evidenced.

- [ ] **Step 5: Request final branch review and fix all Critical/Important findings**

Review the commits since `431cfc2e`. Re-run the covering tests after any fix and create a final `[KNK-566] Fix` commit if needed. Do not push.
