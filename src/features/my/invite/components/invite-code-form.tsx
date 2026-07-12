'use client';

import { type SubmitEvent, useId, useState } from 'react';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { useRedeemInviteCode } from '../hooks/use-redeem-invite-code';

export function InviteCodeForm() {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [code, setCode] = useState('');
  const { redeemInviteCode, isRedeeming, errorMessage, clearError } =
    useRedeemInviteCode({
      source: 'invite_page',
      onSuccess: () => {
        setCode('');
      },
    });

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isRedeeming) {
      return;
    }

    redeemInviteCode(code);
  };

  return (
    <form aria-busy={isRedeeming} onSubmit={handleSubmit}>
      <Field
        data-invalid={Boolean(errorMessage)}
        className="gap-2"
        aria-labelledby={inputId}>
        <FieldLabel htmlFor={inputId}>초대 코드</FieldLabel>
        <div className="flex gap-2">
          <Input
            id={inputId}
            className="flex-1 uppercase"
            maxLength={8}
            value={code}
            disabled={isRedeeming}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? errorId : undefined}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="예: ABCD1234"
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              clearError();
            }}
          />
          <Button
            className="relative shrink-0"
            type="submit"
            disabled={isRedeeming}>
            <LoadingButtonContent
              isLoading={isRedeeming}
              loadingLabel="초대 코드 등록 중">
              등록
            </LoadingButtonContent>
          </Button>
        </div>
        <FieldError id={errorId}>{errorMessage}</FieldError>
      </Field>
    </form>
  );
}
