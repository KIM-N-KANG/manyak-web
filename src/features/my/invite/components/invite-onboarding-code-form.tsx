'use client';

import { type SubmitEvent, useId, useState } from 'react';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useRedeemInviteCode } from '../hooks/use-redeem-invite-code';
import { sanitizeInviteCodeInput } from '../utils/invite-code';

/** 가입 직후 초대 코드 안내 시트 안의 코드 입력 폼. 등록과 건너뛰기 버튼을 함께 둔다. */
export function InviteOnboardingCodeForm({
  disabled = false,
  isSubmitPending = false,
  onSkip,
  onSuccess,
}: {
  /** 상위 시트가 안내 완료를 저장하는 동안 입력과 버튼을 모두 막는다. */
  disabled?: boolean;
  /** 등록에 성공한 뒤 시트를 닫는 동안에도 등록 버튼의 로딩 표시를 이어 간다. */
  isSubmitPending?: boolean;
  onSkip?: () => void;
  /** 코드 등록에 성공하면 입력을 비운 뒤 호출된다. */
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
    <form
      className="flex min-h-0 flex-col gap-8 overflow-y-auto overscroll-contain px-4 pt-8 pb-4"
      aria-busy={isBusy}
      onSubmit={handleSubmit}>
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

      <div className="flex flex-col gap-2">
        <Button
          className="relative w-full"
          type="submit"
          size="lg"
          disabled={isBusy}>
          <LoadingButtonContent
            isLoading={isRedeeming || isSubmitPending}
            loadingLabel="등록 중">
            등록하기
          </LoadingButtonContent>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full text-foreground-secondary"
          disabled={isBusy}
          onClick={onSkip}>
          닫기
        </Button>
      </div>
    </form>
  );
}
