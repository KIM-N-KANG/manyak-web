'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';

import {
  FEEDBACK_BODY_MAX_LENGTH,
  FEEDBACK_DESCRIPTION,
  FEEDBACK_EMAIL_MAX_LENGTH,
  FEEDBACK_TITLE_LINES,
} from '../constants';
import { useFeedbackForm } from '../hooks/use-feedback-form';

export function FeedbackForm() {
  const {
    body,
    email,
    changeBody,
    changeEmail,
    submitFeedback,
    canSubmit,
    isSubmitting,
  } = useFeedbackForm();

  return (
    <form onSubmit={submitFeedback} className="flex flex-1 flex-col">
      <div className="flex flex-col items-start gap-1 p-4">
        <div className="text-xl font-semibold">
          {FEEDBACK_TITLE_LINES.map((titleLine) => (
            <p key={titleLine}>{titleLine}</p>
          ))}
        </div>
        <p className="text-foreground-secondary">{FEEDBACK_DESCRIPTION}</p>
      </div>

      <div className="mb-2 flex flex-col gap-8 p-4">
        <section
          aria-labelledby="feedback-body-label"
          className="flex flex-col gap-2">
          <Label
            id="feedback-body-label"
            htmlFor="feedback-body"
            className="gap-0.5">
            피드백 내용
            <span className="text-destructive">*</span>
          </Label>
          <InputGroup>
            <InputGroupTextarea
              id="feedback-body"
              maxLength={FEEDBACK_BODY_MAX_LENGTH}
              placeholder="예: 이런 점이 불편했어요, 이런 기능이 있으면 좋겠어요"
              value={body}
              disabled={isSubmitting}
              onChange={changeBody}
            />
            <InputGroupAddon align="block-end">
              <InputGroupText>
                {body.length} / {FEEDBACK_BODY_MAX_LENGTH}
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </section>

        <section
          aria-labelledby="feedback-email-label"
          className="flex flex-col gap-2">
          <Label id="feedback-email-label" htmlFor="feedback-email">
            답변 받을 이메일
          </Label>
          <Input
            id="feedback-email"
            type="email"
            inputMode="email"
            maxLength={FEEDBACK_EMAIL_MAX_LENGTH}
            placeholder="답변이 필요하시면 이메일을 남겨주세요"
            value={email}
            disabled={isSubmitting}
            onChange={changeEmail}
          />
        </section>
      </div>

      <div className="mt-auto flex h-16 items-center px-4">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          aria-busy={isSubmitting}
          disabled={!canSubmit || isSubmitting}>
          피드백 보내기
        </Button>
      </div>
    </form>
  );
}
