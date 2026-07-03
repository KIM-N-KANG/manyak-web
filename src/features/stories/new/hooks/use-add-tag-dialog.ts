'use client';

import { type ChangeEvent, type SubmitEvent, useState } from 'react';

import type { SimpleStoryCustomTagRequestCategory } from '@/api/generated/models';
import { track } from '@/observability/analytics';

import { ADD_TAG_MAX_LENGTH } from '../constants';

type UseAddTagDialogArgs = {
  category: SimpleStoryCustomTagRequestCategory;
  onAddTag: (tag: string) => void;
};

export function useAddTagDialog({ category, onAddTag }: UseAddTagDialogArgs) {
  const [open, setOpen] = useState(false);
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

    track('client_storyCreate_addKeyword_submitted', { category });
    onAddTag(trimmedTag);
    setTag('');
    setOpen(false);
  };

  return {
    open,
    setOpen,
    tag,
    handleTagChange,
    handleSubmit,
    isSubmitDisabled: tag.trim().length === 0,
  };
}
