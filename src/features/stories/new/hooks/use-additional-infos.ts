'use client';

import { type ChangeEvent, useState } from 'react';

import { useInputRefRegistry } from '@/hooks/use-input-ref-registry';
import { createClientId } from '@/lib/create-client-id';
import { track } from '@/observability/analytics';

import {
  ADDITIONAL_INFO_INITIAL_COUNT,
  ADDITIONAL_INFO_MAX_COUNT,
  ADDITIONAL_INFO_MAX_LENGTH,
} from '../constants';
import type { AdditionalInfoInput } from '../types';

/**
 * 빈 추가 정보 인풋 하나를 새 클라이언트 id와 함께 생성한다.
 *
 * @returns 값이 비어 있는 추가 정보 인풋
 */
const createEmptyAdditionalInfo = (): AdditionalInfoInput => ({
  id: createClientId(),
  value: '',
});

/**
 * 초기 개수만큼 빈 추가 정보 인풋 목록을 생성한다.
 *
 * @returns 초기 추가 정보 인풋 배열
 */
const createInitialAdditionalInfos = (): AdditionalInfoInput[] =>
  Array.from(
    { length: ADDITIONAL_INFO_INITIAL_COUNT },
    createEmptyAdditionalInfo,
  );

/**
 * 추가 정보 인풋 목록의 추가·삭제·수정 상태를 관리하는 훅.
 * 새 인풋을 추가하면 해당 인풋으로 포커스와 스크롤을 이동한다.
 *
 * @returns 추가 정보 목록과 추가·삭제·수정·리셋·제출값 조회 함수들
 */
export function useAdditionalInfos() {
  const [additionalInfos, setAdditionalInfos] = useState<AdditionalInfoInput[]>(
    createInitialAdditionalInfos,
  );
  const { registerInput, focusInput } =
    useInputRefRegistry<HTMLTextAreaElement>();

  const addAdditionalInfo = () => {
    if (additionalInfos.length >= ADDITIONAL_INFO_MAX_COUNT) {
      return;
    }

    const additionalInfo = createEmptyAdditionalInfo();

    track('client_storyCreate_additionalInfoAddButton_clicked');
    setAdditionalInfos((previous) => [...previous, additionalInfo]);
    focusInput(additionalInfo.id, { scrollIntoView: true });
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
