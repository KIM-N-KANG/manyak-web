'use client';

import { useEffect } from 'react';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { track } from '@/observability/analytics';

import {
  FEEDBACK_BODY_MAX_LENGTH,
  FEEDBACK_DESCRIPTION,
  FEEDBACK_EMAIL_MAX_LENGTH,
  FEEDBACK_TITLE_LINES,
} from '../constants';
import { useFeedbackForm } from '../hooks/use-feedback-form';

export function FeedbackForm() {
  useEffect(() => {
    track('client_feedback_viewed');
  }, []);

  const {
    body,
    email,
    handleBodyChange,
    handleEmailChange,
    handleSubmit,
    validationError,
    isSubmitting,
  } = useFeedbackForm();

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain">
        <div className="flex flex-col items-start gap-1 p-4">
          <div className="text-xl font-semibold">
            {FEEDBACK_TITLE_LINES.map((titleLine) => (
              <p key={titleLine}>{titleLine}</p>
            ))}
          </div>
          <p className="text-foreground-secondary">{FEEDBACK_DESCRIPTION}</p>
        </div>

        <FieldGroup className="gap-6 p-4 pb-8">
          <Field className="gap-2" aria-labelledby="feedback-body-label">
            <FieldLabel
              id="feedback-body-label"
              htmlFor="feedback-body"
              className="gap-0.5">
              피드백 내용
              <span className="text-destructive">*</span>
            </FieldLabel>
            <InputGroup>
              <InputGroupTextarea
                id="feedback-body"
                maxLength={FEEDBACK_BODY_MAX_LENGTH}
                placeholder="예: 이런 점이 불편했어요, 이런 기능이 있으면 좋겠어요"
                value={body}
                disabled={isSubmitting}
                onChange={handleBodyChange}
              />
              <InputGroupAddon align="block-end">
                <InputGroupText>
                  {body.length} / {FEEDBACK_BODY_MAX_LENGTH}
                </InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field className="gap-2" aria-labelledby="feedback-email-label">
            <FieldLabel id="feedback-email-label" htmlFor="feedback-email">
              답변 받을 이메일
            </FieldLabel>
            <Input
              id="feedback-email"
              type="email"
              inputMode="email"
              maxLength={FEEDBACK_EMAIL_MAX_LENGTH}
              placeholder="예: contact@manyak.app"
              value={email}
              disabled={isSubmitting}
              onChange={handleEmailChange}
            />
            <FieldDescription className="text-foreground-secondary">
              답변이 필요하시면 이메일을 남겨주세요
            </FieldDescription>
          </Field>
        </FieldGroup>
      </div>

      <div className="flex shrink-0 flex-col gap-2 px-4 pb-4">
        <FieldError>{validationError}</FieldError>
        <Button
          type="submit"
          size="lg"
          className="relative w-full"
          aria-busy={isSubmitting}
          disabled={isSubmitting}>
          <LoadingButtonContent
            isLoading={isSubmitting}
            loadingLabel="피드백 전송 중">
            피드백 보내기
          </LoadingButtonContent>
        </Button>
      </div>
    </form>
  );
}
