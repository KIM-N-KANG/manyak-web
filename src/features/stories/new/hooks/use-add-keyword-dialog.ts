'use client';

import { type ChangeEvent, type SubmitEvent, useState } from 'react';

import { ADD_KEYWORD_MAX_LENGTH } from '../constants';

type UseAddKeywordDialogArgs = {
  onAddKeyword: (keyword: string) => void;
};

export function useAddKeywordDialog({ onAddKeyword }: UseAddKeywordDialogArgs) {
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
