'use client';

import { type ChangeEvent, type SubmitEvent, useState } from 'react';

import type { SimpleStoryCustomTagRequestCategory } from '@/api/generated/models';
import { track } from '@/observability/analytics';

import { ADD_KEYWORD_MAX_LENGTH } from '../constants';

type UseAddKeywordDialogArgs = {
  category: SimpleStoryCustomTagRequestCategory;
  onAddKeyword: (keyword: string) => void;
};

export function useAddKeywordDialog({
  category,
  onAddKeyword,
}: UseAddKeywordDialogArgs) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  const handleKeywordChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setKeyword(event.target.value.slice(0, ADD_KEYWORD_MAX_LENGTH));
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      return;
    }

    track('client_storyCreate_addKeyword_submitted', { category });
    onAddKeyword(trimmedKeyword);
    setKeyword('');
    setOpen(false);
  };

  return {
    open,
    setOpen,
    keyword,
    handleKeywordChange,
    handleSubmit,
    isSubmitDisabled: keyword.trim().length === 0,
  };
}
