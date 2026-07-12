'use client';

import { type SubmitEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

import { useRedeemInviteCode } from '../hooks/use-redeem-invite-code';

export function InviteOnboardingCodeForm({
  disabled = false,
  isSubmitPending = false,
  onSuccess,
  onSkip,
}: {
  disabled?: boolean;
  isSubmitPending?: boolean;
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
    <form className="contents" aria-busy={isBusy} onSubmit={handleSubmit}>
      <FieldGroup>
        <Field
          data-invalid={Boolean(errorMessage)}
          className="gap-2"
          aria-labelledby={inputId}>
          <Label htmlFor={inputId}>초대 코드</Label>
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
      </FieldGroup>

      <DialogFooter>
        <Button
          type="button"
          variant="secondary"
          disabled={isBusy}
          onClick={onSkip}>
          나중에 하기
        </Button>
        <Button type="submit" disabled={isBusy}>
          {isRedeeming || isSubmitPending ? (
            <Spinner aria-label="등록 중" />
          ) : (
            '등록하기'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
