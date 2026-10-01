'use client';

import { type ChangeEvent, type SubmitEvent, useState } from 'react';

import { ADD_TAG_MAX_LENGTH } from '@/features/stories/_shared/constants/tag';

type UseAddTagDialogArgs = {
  onAddTag: (tag: string) => void;
};

/**
 * 커스텀 키워드 추가 다이얼로그의 열림 상태와 입력·제출을 관리하는 훅
 *
 * @param onAddTag 유효한 키워드가 제출됐을 때 호출되는 콜백
 * @returns 다이얼로그 열림 상태와 입력값·검증 오류·핸들러
 */
export function useAddTagDialog({ onAddTag }: UseAddTagDialogArgs) {
  const [isOpen, setIsOpen] = useState(false);
  const [tag, setTag] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleTagChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextTag = event.target.value.slice(0, ADD_TAG_MAX_LENGTH);

    setTag(nextTag);

    if (nextTag.trim()) {
      setValidationError(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (!open) {
      setValidationError(null);
    }
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTag = tag.trim();

    if (!trimmedTag) {
      setValidationError('키워드를 입력해주세요');

      return;
    }

    setValidationError(null);
    onAddTag(trimmedTag);
    setTag('');
    setIsOpen(false);
  };

  return {
    isOpen,
    handleOpenChange,
    tag,
    validationError,
    handleTagChange,
    handleSubmit,
  };
}
