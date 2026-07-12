'use client';

import { type ChangeEvent, type SubmitEvent, useState } from 'react';

import { toast } from 'sonner';

import { useCreateFeedback } from '@/api/generated/endpoints/feedbacks/feedbacks';
import { CreateFeedbackRequestPlatform } from '@/api/generated/models';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import {
  FEEDBACK_BODY_MAX_LENGTH,
  FEEDBACK_EMAIL_MAX_LENGTH,
} from '../constants';

/** 피드백 폼의 입력 상태와 제출(글자 수 제한, 성공/실패 토스트)을 관리하는 훅 */
export function useFeedbackForm() {
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');

  const createFeedback = useCreateFeedback({
    mutation: {
      onSuccess: () => {
        toast.success(TOAST_MESSAGE.FEEDBACK_SUBMITTED);
        setBody('');
        setEmail('');
      },
      onError: () => {
        toast.error(TOAST_MESSAGE.FEEDBACK_SUBMIT_FAILED);
      },
    },
  });

  const handleBodyChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setBody(event.target.value.slice(0, FEEDBACK_BODY_MAX_LENGTH));
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value.slice(0, FEEDBACK_EMAIL_MAX_LENGTH));
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      return;
    }

    const trimmedEmail = email.trim();

    track('client_feedback_form_submitted');
    createFeedback.mutate({
      data: {
        body: trimmedBody,
        email: trimmedEmail || null,
        platform: CreateFeedbackRequestPlatform.WEB,
      },
    });
  };

  return {
    body,
    email,
    handleBodyChange,
    handleEmailChange,
    handleSubmit,
    canSubmit: body.trim().length > 0,
    isSubmitting: createFeedback.isPending,
  };
}
