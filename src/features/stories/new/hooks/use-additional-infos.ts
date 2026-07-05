'use client';

import { type ChangeEvent, useRef, useState } from 'react';

import { createClientId } from '@/lib/create-client-id';
import { track } from '@/observability/analytics';

import {
  ADDITIONAL_INFO_INITIAL_COUNT,
  ADDITIONAL_INFO_MAX_COUNT,
  ADDITIONAL_INFO_MAX_LENGTH,
} from '../constants';
import type { AdditionalInfoInput } from '../types';

const createEmptyAdditionalInfo = (): AdditionalInfoInput => ({
  id: createClientId(),
  value: '',
});

const createInitialAdditionalInfos = (): AdditionalInfoInput[] =>
  Array.from(
    { length: ADDITIONAL_INFO_INITIAL_COUNT },
    createEmptyAdditionalInfo,
  );

export function useAdditionalInfos() {
  const [additionalInfos, setAdditionalInfos] = useState<AdditionalInfoInput[]>(
    createInitialAdditionalInfos,
  );
  const inputRefs = useRef(new Map<string, HTMLTextAreaElement>());

  const registerInput = (id: string, element: HTMLTextAreaElement | null) => {
    if (element) {
      inputRefs.current.set(id, element);
    } else {
      inputRefs.current.delete(id);
    }
  };

  const focusInput = (id: string) => {
    requestAnimationFrame(() => {
      const element = inputRefs.current.get(id);

      element?.focus({ preventScroll: true });
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const addAdditionalInfo = () => {
    if (additionalInfos.length >= ADDITIONAL_INFO_MAX_COUNT) {
      return;
    }

    const additionalInfo = createEmptyAdditionalInfo();

    track('client_storyCreate_additionalInfoAddButton_clicked');
    setAdditionalInfos((previous) => [...previous, additionalInfo]);
    focusInput(additionalInfo.id);
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
    setAdditionalInfos(createInitialAdditionalInfos());
  };

  return {
    additionalInfos,
    canAddAdditionalInfo: additionalInfos.length < ADDITIONAL_INFO_MAX_COUNT,
    addAdditionalInfo,
    removeAdditionalInfo,
    changeAdditionalInfo,
    registerAdditionalInfoInput: registerInput,
    getSubmittedAdditionalInfos,
    resetAdditionalInfos,
  };
}
