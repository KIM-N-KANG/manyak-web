'use client';

import { type ChangeEvent, type SubmitEvent, useState } from 'react';

import type { SimpleStoryCustomTagRequestCategory } from '@/api/generated/models';
import { track } from '@/observability/analytics';

import { ADD_TAG_MAX_LENGTH } from '../constants';

type UseAddTagDialogArgs = {
  category: SimpleStoryCustomTagRequestCategory;
  onAddTag: (tag: string) => void;
};

/** 커스텀 키워드 추가 다이얼로그의 열림 상태와 입력·제출을 관리하는 훅 */
export function useAddTagDialog({ category, onAddTag }: UseAddTagDialogArgs) {
  const [isOpen, setIsOpen] = useState(false);
  const [tag, setTag] = useState('');

  const handleTagChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setTag(event.target.value.slice(0, ADD_TAG_MAX_LENGTH));
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTag = tag.trim();

    if (!trimmedTag) {
      return;
    }

    track('client_storyCreate_addTag_submitted', { category });
    onAddTag(trimmedTag);
    setTag('');
    setIsOpen(false);
  };

  return {
    isOpen,
    setIsOpen,
    tag,
    handleTagChange,
    handleSubmit,
    isSubmitDisabled: tag.trim().length === 0,
  };
}
