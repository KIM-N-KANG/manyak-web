'use client';

import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';

import {
  CHARACTER_NAME_DUPLICATE_FOOTER_ERROR,
  CHARACTER_NAME_RESERVED_CHARACTER_ERROR,
  GENRE_CATEGORY,
  GENRE_SECTION_LABEL,
  PROTAGONIST_CATEGORY,
  SUPPORTING_CHARACTER_CATEGORY,
  TAG_CATEGORIES,
} from '../../constants';
import type { StoryTagStepController } from '../../hooks/use-story-tag-step';
import type { TagCategory } from '../../types';
import { getGenerateStorylinesErrorMessage } from '../../utils/generate-storylines-error-message';
import { StickyTabsList } from '../shared/sticky-tabs-list';
import { StoryCreateErrorMessage } from '../shared/story-create-error-message';
import { StoryCreateStepLayout } from '../step-layout/story-create-step-layout';
import { AddTagDialog } from './add-tag-dialog';
import { CharacterForm } from './character-form';
import { SupportingCharacterList } from './supporting-character-list';
import { TagChipGrid } from './tag-chip-grid';

type StoryTagStepSectionProps = {
  controller: StoryTagStepController;
  hasGenerateStorylinesError: boolean;
  isGuestLimitReached: boolean;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryTagStepSection({
  controller,
  hasGenerateStorylinesError,
  isGuestLimitReached,
  onScroll,
}: StoryTagStepSectionProps) {
  const {
    activeCategory,
    changeCategory,
    selectedGenreTagIds,
    selectedCustomGenreTagIds,
    customGenreTags,
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
    hasReservedCharacterNameError,
    isGeneratingStorylines,
    isDuplicateName,
    hasReservedCharacterName,
    isCategoryUnlocked,
    isFirstCategory,
    isLastCategory,
    goToNextCategory,
    goToPreviousCategory,
    toggleGenreTag,
    toggleCustomGenreTag,
    addCustomGenreTag,
    toggleFeatureTag,
    toggleCustomFeatureTag,
    addCustomFeatureTag,
    changeCharacterName,
    changeCharacterGender,
    addSupportingCharacter,
    removeSupportingCharacter,
    registerCharacterNameInput,
    handleGenerateStorylines,
  } = controller;

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
        ) : hasReservedCharacterNameError ? (
          <StoryCreateErrorMessage>
            {CHARACTER_NAME_RESERVED_CHARACTER_ERROR}
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
          variant="line"
          containerClassName="mt-0 px-0 py-0"
          className="w-full gap-0 border-b p-0">
          {TAG_CATEGORIES.map(({ value, label, required }) => (
            <TabsTrigger
              key={value}
              value={value}
              disabled={!isCategoryUnlocked(value)}
              className="h-full gap-0.5 rounded-none border-0 px-2 py-0 after:-bottom-px!">
              {label}
              {required && <span className="text-destructive">*</span>}
            </TabsTrigger>
          ))}
        </StickyTabsList>

        <TabsContent value="GENRE" className="px-4 pt-4 pb-8">
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
                customTags={customGenreTags}
                selectedTagIds={selectedGenreTagIds}
                selectedCustomTagIds={selectedCustomGenreTagIds}
                isMaxSelectionReached={isGenreMaxReached}
                isLoadingTags={showTagsSkeleton}
                hasTagsError={simpleStoryTags.isError}
                disabled={isGeneratingStorylines}
                addTagTrigger={
                  <AddTagDialog
                    category="GENRE"
                    categoryLabel={GENRE_CATEGORY.label}
                    fieldId="GENRE"
                    placeholder={GENRE_CATEGORY.placeholder}
                    disabled={isGeneratingStorylines || isGenreMaxReached}
                    onAddTag={addCustomGenreTag}
                  />
                }
                onTogglePredefinedTag={toggleGenreTag}
                onToggleCustomTag={toggleCustomGenreTag}
              />
            </Field>
          </FieldGroup>
        </TabsContent>

        <TabsContent value="PROTAGONIST" className="p-4 pb-8">
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
            nameErrorMessage={
              hasReservedCharacterName(protagonist.id)
                ? CHARACTER_NAME_RESERVED_CHARACTER_ERROR
                : undefined
            }
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

        <TabsContent value="SUPPORTING_CHARACTER" className="pb-8">
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
            hasReservedCharacterName={hasReservedCharacterName}
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
