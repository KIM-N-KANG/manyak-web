'use client';

import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';

import {
  CHARACTER_NAME_DUPLICATE_FOOTER_ERROR,
  GENRE_CATEGORY,
  GENRE_SECTION_LABEL,
  PROTAGONIST_CATEGORY,
  SUPPORTING_CHARACTER_CATEGORY,
  TAG_CATEGORIES,
} from '../../constants';
import { useStoryTagStep } from '../../hooks/use-story-tag-step';
import type { TagCategory } from '../../types';
import { getGenerateStorylinesErrorMessage } from '../../utils/generate-storylines-error-message';
import { StickyTabsList } from '../shared/sticky-tabs-list';
import { StoryCreateErrorMessage } from '../shared/story-create-error-message';
import { StoryCreateStepLayout } from '../step-layout/story-create-step-layout';
import { CharacterForm } from './character-form';
import { SupportingCharacterList } from './supporting-character-list';
import { TagChipGrid } from './tag-chip-grid';

type StoryTagStepSectionProps = {
  isGeneratingStorylines: boolean;
  hasGenerateStorylinesError: boolean;
  isGuestLimitReached: boolean;
  onGenerateStorylines: (
    request: Omit<GenerateSimpleStorylinesRequest, 'requestId'>,
  ) => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryTagStepSection({
  isGeneratingStorylines,
  hasGenerateStorylinesError,
  isGuestLimitReached,
  onGenerateStorylines,
  onScroll,
}: StoryTagStepSectionProps) {
  const {
    activeCategory,
    changeCategory,
    selectedGenreTagIds,
    isGenreMaxReached,
    protagonist,
    supportingCharacters,
    canAddSupportingCharacter,
    isFeatureMaxReached,
    simpleStoryTags,
    showTagsSkeleton,
    tagsByCategory,
    hasCategoryValidationError,
    hasDuplicateNameError,
    isDuplicateName,
    isCategoryUnlocked,
    isFirstCategory,
    isLastCategory,
    goToNextCategory,
    goToPreviousCategory,
    toggleGenreTag,
    toggleFeatureTag,
    toggleCustomFeatureTag,
    addCustomFeatureTag,
    changeCharacterName,
    changeCharacterGender,
    addSupportingCharacter,
    removeSupportingCharacter,
    registerCharacterNameInput,
    handleGenerateStorylines,
  } = useStoryTagStep({
    isGeneratingStorylines,
    onGenerateStorylines,
  });

  const activeCategoryConfig = TAG_CATEGORIES.find(
    (category) => category.value === activeCategory,
  );

  return (
    <StoryCreateStepLayout
      titleLines={['만들고 싶은 스토리의', '키워드를 선택해주세요']}
      description="선택한 키워드로 AI가 스토리라인을 생성해요"
      onScroll={onScroll}
      footerMessage={
        hasCategoryValidationError ? (
          <StoryCreateErrorMessage>
            키워드를 하나 이상 선택해주세요
          </StoryCreateErrorMessage>
        ) : hasDuplicateNameError ? (
          <StoryCreateErrorMessage>
            {CHARACTER_NAME_DUPLICATE_FOOTER_ERROR}
          </StoryCreateErrorMessage>
        ) : null
      }
      footer={
        <>
          {!isFirstCategory && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isGeneratingStorylines}
              onClick={goToPreviousCategory}>
              이전
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            className="relative"
            aria-busy={isGeneratingStorylines}
            disabled={isGeneratingStorylines}
            onClick={
              isLastCategory ? handleGenerateStorylines : goToNextCategory
            }>
            {isLastCategory ? (
              <LoadingButtonContent
                isLoading={isGeneratingStorylines}
                loadingLabel="스토리라인 생성 중">
                스토리라인 만들기
              </LoadingButtonContent>
            ) : (
              '다음'
            )}
          </Button>
        </>
      }>
      <Tabs
        value={activeCategory}
        onValueChange={(value) => changeCategory(value as TagCategory)}
        className="gap-0">
        <StickyTabsList
          bottomSlot={
            activeCategoryConfig && (
              <p className="pt-2 text-sm text-foreground-secondary">
                {activeCategoryConfig.description}
              </p>
            )
          }>
          {TAG_CATEGORIES.map(({ value, label, required }) => (
            <TabsTrigger
              key={value}
              value={value}
              disabled={!isCategoryUnlocked(value)}
              className="gap-0.5">
              {label}
              {required && <span className="text-destructive">*</span>}
            </TabsTrigger>
          ))}
        </StickyTabsList>

        <TabsContent value="GENRE" className="p-4 pt-2 pb-6">
          <FieldGroup className="gap-8">
            <Field className="gap-2" aria-labelledby="genre-label">
              <FieldLabel id="genre-label" className="gap-0.5">
                {GENRE_SECTION_LABEL}
                {GENRE_CATEGORY.required && (
                  <span className="text-destructive">*</span>
                )}
              </FieldLabel>
              <TagChipGrid
                keyPrefix="GENRE"
                predefinedTags={tagsByCategory.GENRE}
                customTags={[]}
                selectedTagIds={selectedGenreTagIds}
                selectedCustomTagIds={[]}
                isMaxSelectionReached={isGenreMaxReached}
                isLoadingTags={showTagsSkeleton}
                hasTagsError={simpleStoryTags.isError}
                disabled={isGeneratingStorylines}
                onTogglePredefinedTag={toggleGenreTag}
                onToggleCustomTag={() => {}}
              />
            </Field>
          </FieldGroup>
        </TabsContent>

        <TabsContent value="PROTAGONIST" className="p-4 pt-2 pb-6">
          <CharacterForm
            category="PROTAGONIST"
            categoryLabel={PROTAGONIST_CATEGORY.label}
            character={protagonist}
            fieldLabelPrefix="주인공"
            namePlaceholder={PROTAGONIST_CATEGORY.namePlaceholder}
            tagPlaceholder={PROTAGONIST_CATEGORY.placeholder}
            predefinedTags={tagsByCategory.PROTAGONIST}
            isMaxSelectionReached={isFeatureMaxReached(
              'PROTAGONIST',
              protagonist.id,
            )}
            isFeatureRequired={PROTAGONIST_CATEGORY.required}
            isLoadingTags={showTagsSkeleton}
            hasTagsError={simpleStoryTags.isError}
            disabled={isGeneratingStorylines}
            onChangeName={(name) =>
              changeCharacterName('PROTAGONIST', protagonist.id, name)
            }
            onChangeGender={(gender) =>
              changeCharacterGender('PROTAGONIST', protagonist.id, gender)
            }
            onTogglePredefinedTag={(tagId, pressed) =>
              toggleFeatureTag('PROTAGONIST', protagonist.id, tagId, pressed)
            }
            onToggleCustomTag={(tagId, pressed) =>
              toggleCustomFeatureTag(
                'PROTAGONIST',
                protagonist.id,
                tagId,
                pressed,
              )
            }
            onAddCustomTag={(name) =>
              addCustomFeatureTag('PROTAGONIST', protagonist.id, name)
            }
          />
        </TabsContent>

        <TabsContent value="SUPPORTING_CHARACTER" className="p-4 pt-2 pb-6">
          <SupportingCharacterList
            categoryLabel={SUPPORTING_CHARACTER_CATEGORY.label}
            characters={supportingCharacters}
            tagPlaceholder={SUPPORTING_CHARACTER_CATEGORY.placeholder}
            predefinedTags={tagsByCategory.SUPPORTING_CHARACTER}
            canAddCharacter={canAddSupportingCharacter}
            isLoadingTags={showTagsSkeleton}
            hasTagsError={simpleStoryTags.isError}
            disabled={isGeneratingStorylines}
            isFeatureMaxReached={(characterId) =>
              isFeatureMaxReached('SUPPORTING_CHARACTER', characterId)
            }
            isDuplicateName={isDuplicateName}
            onRegisterNameInput={registerCharacterNameInput}
            onChangeName={(characterId, name) =>
              changeCharacterName('SUPPORTING_CHARACTER', characterId, name)
            }
            onChangeGender={(characterId, gender) =>
              changeCharacterGender('SUPPORTING_CHARACTER', characterId, gender)
            }
            onTogglePredefinedTag={(characterId, tagId, pressed) =>
              toggleFeatureTag(
                'SUPPORTING_CHARACTER',
                characterId,
                tagId,
                pressed,
              )
            }
            onToggleCustomTag={(characterId, tagId, pressed) =>
              toggleCustomFeatureTag(
                'SUPPORTING_CHARACTER',
                characterId,
                tagId,
                pressed,
              )
            }
            onAddCustomTag={(characterId, name) =>
              addCustomFeatureTag('SUPPORTING_CHARACTER', characterId, name)
            }
            onAddCharacter={addSupportingCharacter}
            onRemoveCharacter={removeSupportingCharacter}
          />
        </TabsContent>
      </Tabs>
      {hasGenerateStorylinesError && (
        <StoryCreateErrorMessage className="px-4">
          {getGenerateStorylinesErrorMessage({
            isGuestLimitReached,
            isRegeneration: false,
          })}
        </StoryCreateErrorMessage>
      )}
    </StoryCreateStepLayout>
  );
}
