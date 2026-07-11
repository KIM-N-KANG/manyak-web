'use client';

import { type SubmitEvent, useEffect, useId, useState } from 'react';

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
  disabled = false,
}: {
  source: InviteCodeSource;
  onSuccess?: () => void;
  onPendingChange?: (pending: boolean) => void;
  autoFocus?: boolean;
  disabled?: boolean;
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
  const isBusy = isRedeeming || disabled;

  useEffect(() => {
    onPendingChange?.(isBusy);
  }, [isBusy, onPendingChange]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    redeemInviteCode(code);
  };

  return (
    <form
      className="flex w-full flex-col gap-3"
      aria-busy={isBusy}
      onSubmit={handleSubmit}>
      <Field data-invalid={Boolean(errorMessage)}>
        <FieldLabel htmlFor={inputId}>친구 초대 코드</FieldLabel>
        <Input
          id={inputId}
          className="h-12 uppercase"
          value={code}
          disabled={isBusy}
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
      <Button className="w-full" type="submit" size="lg" disabled={isBusy}>
        {isRedeeming ? '입력 중...' : '500 크레딧 받기'}
      </Button>
    </form>
  );
}
