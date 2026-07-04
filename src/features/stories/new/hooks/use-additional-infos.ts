'use client';

import { type ChangeEvent, useState } from 'react';

import { createClientId } from '@/lib/create-client-id';
import { track } from '@/observability/analytics';

import {
  ADDITIONAL_INFO_MAX_COUNT,
  ADDITIONAL_INFO_MAX_LENGTH,
} from '../constants';
import type { AdditionalInfoInput } from '../types';

const createEmptyAdditionalInfo = (): AdditionalInfoInput => ({
  id: createClientId(),
  value: '',
});

export function useAdditionalInfos() {
  const [additionalInfos, setAdditionalInfos] = useState<AdditionalInfoInput[]>(
    () => [createEmptyAdditionalInfo()],
  );

  const addAdditionalInfo = () => {
    if (additionalInfos.length >= ADDITIONAL_INFO_MAX_COUNT) {
      return;
    }

    track('client_storyCreate_additionalInfoAddButton_clicked');
    setAdditionalInfos((previous) => [
      ...previous,
      createEmptyAdditionalInfo(),
    ]);
  };

  const removeAdditionalInfo = (id: string) => {
    track('client_storyCreate_additionalInfoRemoveButton_clicked');
    setAdditionalInfos((previous) =>
      previous.filter((additionalInfo) => additionalInfo.id !== id),
    );
  };

  const changeAdditionalInfo = (
    id: string,
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const nextValue = event.target.value.slice(0, ADDITIONAL_INFO_MAX_LENGTH);

    setAdditionalInfos((previous) =>
      previous.map((additionalInfo) =>
        additionalInfo.id === id
          ? { ...additionalInfo, value: nextValue }
          : additionalInfo,
      ),
    );
  };

  const getSubmittedAdditionalInfos = () =>
    additionalInfos.map(({ value }) => value.trim()).filter(Boolean);

  const resetAdditionalInfos = () => {
    setAdditionalInfos([createEmptyAdditionalInfo()]);
  };

  return {
    additionalInfos,
    canAddAdditionalInfo: additionalInfos.length < ADDITIONAL_INFO_MAX_COUNT,
    addAdditionalInfo,
    removeAdditionalInfo,
    changeAdditionalInfo,
    getSubmittedAdditionalInfos,
    resetAdditionalInfos,
  };
}
