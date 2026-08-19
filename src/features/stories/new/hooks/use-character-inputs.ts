'use client';

import { useState } from 'react';

import { useInputRefRegistry } from '@/hooks/use-input-ref-registry';
import { createClientId } from '@/lib/create-client-id';

import {
  CHARACTER_FEATURE_MAX_COUNT,
  CHARACTER_NAME_MAX_LENGTH,
  SUPPORTING_CHARACTER_INITIAL_COUNT,
  SUPPORTING_CHARACTER_MAX_COUNT,
} from '../constants';
import type {
  CharacterGender,
  CharacterInput,
  CharacterTagCategory,
  CustomTag,
} from '../types';

/**
 * 빈 인물 입력 하나를 새 클라이언트 id와 함께 생성한다.
 *
 * @returns 이름·성별·특징이 모두 비어 있는 인물 입력
 */
const createEmptyCharacter = (): CharacterInput => ({
  id: createClientId(),
  name: '',
  gender: null,
  selectedTagIds: [],
  selectedCustomTagIds: [],
  customTags: [],
});

/**
 * 초기 개수만큼 빈 주변 인물 목록을 생성한다.
 *
 * @returns 초기 주변 인물 배열
 */
const createInitialSupportingCharacters = (): CharacterInput[] =>
  Array.from(
    { length: SUPPORTING_CHARACTER_INITIAL_COUNT },
    createEmptyCharacter,
  );

/**
 * 인물이 고른 특징 개수를 센다. 사전 정의 태그와 직접 추가 태그를 합산한다.
 *
 * @param character 대상 인물 입력
 * @returns 선택한 특징 개수
 */
const getFeatureCount = (character: CharacterInput) =>
  character.selectedTagIds.length + character.selectedCustomTagIds.length;

/**
 * 주인공과 주변 인물의 인물 단위 입력(이름·성별·특징)을 관리하는 훅.
 * 주인공은 항상 한 명이고, 주변 인물은 0~5명 사이에서 추가·삭제할 수 있다.
 *
 * @returns 인물 입력 상태와 이름·성별·특징 변경 및 주변 인물 추가·삭제 함수들
 */
export function useCharacterInputs() {
  const [protagonist, setProtagonist] =
    useState<CharacterInput>(createEmptyCharacter);
  const [supportingCharacters, setSupportingCharacters] = useState<
    CharacterInput[]
  >(createInitialSupportingCharacters);
  const { registerInput, focusInput } = useInputRefRegistry<HTMLInputElement>();

  const getCharacters = (category: CharacterTagCategory) =>
    category === 'PROTAGONIST' ? [protagonist] : supportingCharacters;

  /** 해당 카테고리의 인물 하나만 골라 갱신한다. 주인공은 목록이 아니라 단일 상태다. */
  const updateCharacter = (
    category: CharacterTagCategory,
    characterId: string,
    update: (character: CharacterInput) => CharacterInput,
  ) => {
    if (category === 'PROTAGONIST') {
      setProtagonist((previous) =>
        previous.id === characterId ? update(previous) : previous,
      );

      return;
    }

    setSupportingCharacters((previous) =>
      previous.map((character) =>
        character.id === characterId ? update(character) : character,
      ),
    );
  };

  const changeCharacterName = (
    category: CharacterTagCategory,
    characterId: string,
    name: string,
  ) => {
    const nextName = name.slice(0, CHARACTER_NAME_MAX_LENGTH);

    updateCharacter(category, characterId, (character) => ({
      ...character,
      name: nextName,
    }));
  };

  // null은 "랜덤"(AI가 정함)이다. Select에서 랜덤을 고르면 이 값으로 돌아온다.
  const changeCharacterGender = (
    category: CharacterTagCategory,
    characterId: string,
    gender: CharacterGender | null,
  ) => {
    updateCharacter(category, characterId, (character) => ({
      ...character,
      gender,
    }));
  };

  const isFeatureMaxReached = (
    category: CharacterTagCategory,
    characterId: string,
  ) => {
    const character = getCharacters(category).find(
      (item) => item.id === characterId,
    );

    return character
      ? getFeatureCount(character) >= CHARACTER_FEATURE_MAX_COUNT
      : false;
  };

  /** 사전 정의/직접 추가 특징 태그의 토글 로직은 id 타입만 다르므로 함께 만든다. */
  const createToggleFeature =
    <Key extends 'selectedTagIds' | 'selectedCustomTagIds'>(key: Key) =>
    (
      category: CharacterTagCategory,
      characterId: string,
      tagId: CharacterInput[Key][number],
      pressed: boolean,
    ) => {
      updateCharacter(category, characterId, (character) => {
        const selectedIds: CharacterInput[Key][number][] = character[key];

        if (!pressed) {
          return {
            ...character,
            [key]: selectedIds.filter((selectedId) => selectedId !== tagId),
          };
        }

        if (
          selectedIds.includes(tagId) ||
          getFeatureCount(character) >= CHARACTER_FEATURE_MAX_COUNT
        ) {
          return character;
        }

        return { ...character, [key]: [...selectedIds, tagId] };
      });
    };

  const toggleFeatureTag = createToggleFeature('selectedTagIds');
  const toggleCustomFeatureTag = createToggleFeature('selectedCustomTagIds');

  const addCustomFeatureTag = (
    category: CharacterTagCategory,
    characterId: string,
    name: string,
  ) => {
    const customTag: CustomTag = { id: createClientId(), name };

    updateCharacter(category, characterId, (character) => {
      if (getFeatureCount(character) >= CHARACTER_FEATURE_MAX_COUNT) {
        return character;
      }

      return {
        ...character,
        customTags: [...character.customTags, customTag],
        selectedCustomTagIds: [...character.selectedCustomTagIds, customTag.id],
      };
    });
  };

  // 인원 상한은 갱신 함수 안에서 최신 목록으로 판정한다. 렌더 시점의 길이로
  // 막으면 상태가 반영되기 전에 연달아 눌린 클릭이 모두 통과한다.
  // 상한에 걸려 추가되지 않으면 등록된 인풋이 없어 포커스 이동도 그냥 지나간다.
  const addSupportingCharacter = () => {
    const character = createEmptyCharacter();

    setSupportingCharacters((previous) =>
      previous.length >= SUPPORTING_CHARACTER_MAX_COUNT
        ? previous
        : [...previous, character],
    );
    focusInput(character.id, { scrollIntoView: true });
  };

  const removeSupportingCharacter = (characterId: string) => {
    setSupportingCharacters((previous) =>
      previous.filter((character) => character.id !== characterId),
    );
  };

  return {
    protagonist,
    supportingCharacters,
    canAddSupportingCharacter:
      supportingCharacters.length < SUPPORTING_CHARACTER_MAX_COUNT,
    hasProtagonistFeature: getFeatureCount(protagonist) > 0,
    getCharacters,
    isFeatureMaxReached,
    changeCharacterName,
    changeCharacterGender,
    toggleFeatureTag,
    toggleCustomFeatureTag,
    addCustomFeatureTag,
    addSupportingCharacter,
    removeSupportingCharacter,
    registerCharacterNameInput: registerInput,
  };
}
