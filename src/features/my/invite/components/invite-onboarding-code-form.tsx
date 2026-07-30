'use client';

import { type SubmitEvent, useId, useState } from 'react';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useRedeemInviteCode } from '../hooks/use-redeem-invite-code';
import { sanitizeInviteCodeInput } from '../utils/invite-code';

export function InviteOnboardingCodeForm({
  disabled = false,
  isSubmitPending = false,
  onSkip,
  onSuccess,
}: {
  disabled?: boolean;
  isSubmitPending?: boolean;
  onSkip?: () => void;
  onSuccess?: () => void;
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
            value={code}
            disabled={isBusy}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? errorId : undefined}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="예: ABCD1234"
            onChange={(event) => {
              setCode(sanitizeInviteCodeInput(event.target.value));
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
        <Button className="relative" type="submit" disabled={isBusy}>
          <LoadingButtonContent
            isLoading={isRedeeming || isSubmitPending}
            loadingLabel="등록 중">
            등록하기
          </LoadingButtonContent>
        </Button>
      </DialogFooter>
    </form>
  );
}
