'use client';

import { useState } from 'react';

import { useGetSimpleStoryTags } from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

import type { CharacterTagCategory, TagCategory } from '../types';
import { getDuplicateNameCharacterIds } from '../utils/character-name';
import { toCharacterRequest } from '../utils/character-request';
import { getTagsByCategory } from '../utils/tag-categories';
import { useCategoryNavigation } from './use-category-navigation';
import { useCharacterInputs } from './use-character-inputs';
import { useGenreSelection } from './use-genre-selection';

type UseStoryTagStepArgs = {
  isGeneratingStorylines: boolean;
  onGenerateStorylines: (
    request: Omit<GenerateSimpleStorylinesRequest, 'requestId'>,
  ) => void;
};

/**
 * 키워드 스텝의 장르 선택·인물 입력·카테고리 이동을 묶어 화면에 필요한 상태로 제공하는 훅.
 *
 * @param isGeneratingStorylines 스토리라인 생성 진행 여부
 * @param onGenerateStorylines 스토리라인 생성 요청을 실행하는 콜백
 * @returns 장르·인물 입력 상태와 카테고리 이동, 화면에 필요한 핸들러들
 */
export function useStoryTagStep({
  isGeneratingStorylines,
  onGenerateStorylines,
}: UseStoryTagStepArgs) {
  const genreSelection = useGenreSelection();
  const characterInputs = useCharacterInputs();
  const [validationErrorCategory, setValidationErrorCategory] =
    useState<TagCategory | null>(null);
  const [hasAttemptedGenerate, setHasAttemptedGenerate] = useState(false);

  // 주인공을 앞에 둬야 주인공 이름이 남고 뒤에 같은 이름을 쓴 주변 인물이 걸린다.
  const duplicateNameCharacterIds = getDuplicateNameCharacterIds([
    characterInputs.protagonist,
    ...characterInputs.supportingCharacters,
  ]);
  const hasDuplicateName = duplicateNameCharacterIds.size > 0;

  const isCategoryComplete = (category: TagCategory) => {
    if (category === 'GENRE') {
      return genreSelection.hasGenreTag;
    }

    if (category === 'PROTAGONIST') {
      return characterInputs.hasProtagonistFeature;
    }

    return true;
  };

  const navigation = useCategoryNavigation({ isCategoryComplete });

  const simpleStoryTags = useGetSimpleStoryTags();
  const showTagsSkeleton = useDelayedLoading(simpleStoryTags.isLoading);
  const tagsByCategory = getTagsByCategory(simpleStoryTags.data?.data ?? []);

  const clearValidationErrorOnSelection = (
    category: TagCategory,
    pressed = true,
  ) => {
    if (!pressed) {
      return;
    }

    setValidationErrorCategory((previous) =>
      previous === category ? null : previous,
    );
  };

  const toggleGenreTag = (tagId: number, pressed: boolean) => {
    clearValidationErrorOnSelection('GENRE', pressed);
    genreSelection.toggleGenreTag(tagId, pressed);
  };

  const toggleFeatureTag = (
    category: CharacterTagCategory,
    characterId: string,
    tagId: number,
    pressed: boolean,
  ) => {
    clearValidationErrorOnSelection(category, pressed);
    characterInputs.toggleFeatureTag(category, characterId, tagId, pressed);
  };

  const toggleCustomFeatureTag = (
    category: CharacterTagCategory,
    characterId: string,
    tagId: string,
    pressed: boolean,
  ) => {
    clearValidationErrorOnSelection(category, pressed);
    characterInputs.toggleCustomFeatureTag(
      category,
      characterId,
      tagId,
      pressed,
    );
  };

  const addCustomFeatureTag = (
    category: CharacterTagCategory,
    characterId: string,
    name: string,
  ) => {
    clearValidationErrorOnSelection(category);
    characterInputs.addCustomFeatureTag(category, characterId, name);
  };

  const goToNextCategory = () => {
    if (!isCategoryComplete(navigation.activeCategory)) {
      setValidationErrorCategory(navigation.activeCategory);

      return;
    }

    setValidationErrorCategory(null);
    navigation.goToNextCategory();
  };

  const canGenerateStorylines =
    genreSelection.hasGenreTag &&
    characterInputs.hasProtagonistFeature &&
    !hasDuplicateName;

  // requestId는 요청(mutate) 시점마다 새로 부여해야 하므로(백그라운드 복구 멱등 키)
  // 여기서는 붙이지 않고 퍼널 훅이 채운다.
  const buildGenerateRequest = (): Omit<
    GenerateSimpleStorylinesRequest,
    'requestId'
  > => ({
    genreTagIds: genreSelection.selectedGenreTagIds,
    protagonist: toCharacterRequest(characterInputs.protagonist),
    // 비워 둔 인물도 한 명으로 세어 AI가 그 자리를 채우므로 걸러내지 않는다.
    supportingCharacters:
      characterInputs.supportingCharacters.map(toCharacterRequest),
  });

  // 이름이 겹치면 서버가 400으로 막으므로 요청 전에 세운다(스펙 §4-3-2).
  // 눌러 본 뒤에만 푸터 오류를 띄우고, 이름을 고쳐 중복이 풀리면 저절로 사라진다.
  const handleGenerateStorylines = () => {
    setHasAttemptedGenerate(true);

    if (!canGenerateStorylines) {
      return;
    }

    onGenerateStorylines(buildGenerateRequest());
  };

  return {
    activeCategory: navigation.activeCategory,
    changeCategory: navigation.changeCategory,
    selectedGenreTagIds: genreSelection.selectedGenreTagIds,
    isGenreMaxReached: genreSelection.isGenreMaxReached,
    protagonist: characterInputs.protagonist,
    supportingCharacters: characterInputs.supportingCharacters,
    canAddSupportingCharacter: characterInputs.canAddSupportingCharacter,
    isFeatureMaxReached: characterInputs.isFeatureMaxReached,
    simpleStoryTags,
    showTagsSkeleton,
    isGeneratingStorylines,
    tagsByCategory,
    hasCategoryValidationError:
      validationErrorCategory === navigation.activeCategory,
    hasDuplicateNameError: hasAttemptedGenerate && hasDuplicateName,
    isDuplicateName: (characterId: string) =>
      duplicateNameCharacterIds.has(characterId),
    isCategoryUnlocked: navigation.isCategoryUnlocked,
    isFirstCategory: navigation.isFirstCategory,
    isLastCategory: navigation.isLastCategory,
    goToNextCategory,
    goToPreviousCategory: navigation.goToPreviousCategory,
    toggleGenreTag,
    toggleFeatureTag,
    toggleCustomFeatureTag,
    addCustomFeatureTag,
    changeCharacterName: characterInputs.changeCharacterName,
    changeCharacterGender: characterInputs.changeCharacterGender,
    addSupportingCharacter: characterInputs.addSupportingCharacter,
    removeSupportingCharacter: characterInputs.removeSupportingCharacter,
    registerCharacterNameInput: characterInputs.registerCharacterNameInput,
    handleGenerateStorylines,
  };
}
