'use client';

import { type SubmitEvent, useId, useState } from 'react';

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { useRedeemInviteCode } from '../hooks/use-redeem-invite-code';

export function InviteOnboardingCodeForm({
  disabled = false,
  onSuccess,
  onSkip,
}: {
  disabled?: boolean;
  onSuccess?: () => void;
  onSkip?: () => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [code, setCode] = useState('');
  const { redeemInviteCode, isRedeeming, errorMessage, clearError } =
    useRedeemInviteCode({
      source: 'onboarding',
      onSuccess: () => {
        setCode('');
        onSuccess?.();
      },
    });
  const isBusy = isRedeeming || disabled;

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    redeemInviteCode(code);
  };

  return (
    <form
      className="flex w-full flex-col gap-6"
      aria-busy={isBusy}
      onSubmit={handleSubmit}>
      <Field
        data-invalid={Boolean(errorMessage)}
        className="gap-2"
        aria-labelledby={inputId}>
        <FieldLabel htmlFor={inputId}>친구 초대 코드</FieldLabel>
        <Input
          id={inputId}
          className="uppercase"
          maxLength={8}
          value={code}
          disabled={isBusy}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="예: ABCD1234"
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            clearError();
          }}
        />
        <FieldError id={errorId}>{errorMessage}</FieldError>
      </Field>

      <AlertDialogFooter>
        <AlertDialogCancel type="button" disabled={isBusy} onClick={onSkip}>
          나중에 하기
        </AlertDialogCancel>
        <AlertDialogAction type="submit" disabled={isBusy}>
          {isRedeeming ? '등록 중...' : '등록하기'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </form>
  );
}
