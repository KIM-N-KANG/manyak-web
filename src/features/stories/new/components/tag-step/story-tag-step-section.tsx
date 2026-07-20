'use client';

import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';

import { TAG_CATEGORIES } from '../../constants';
import { useStoryTagStep } from '../../hooks/use-story-tag-step';
import type { TagCategory } from '../../types';
import { getGenerateStorylinesErrorMessage } from '../../utils/generate-storylines-error-message';
import { StickyTabsList } from '../shared/sticky-tabs-list';
import { StoryCreateErrorMessage } from '../shared/story-create-error-message';
import { StoryCreateStepLayout } from '../step-layout/story-create-step-layout';
import { StoryTagCategorySection } from './story-tag-category-section';

type StoryTagStepSectionProps = {
  isGeneratingStorylines: boolean;
  hasGenerateStorylinesError: boolean;
  isGuestLimitReached: boolean;
  onGenerateStorylines: (request: GenerateSimpleStorylinesRequest) => void;
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
    selectedTagIdsByCategory,
    selectedCustomTagIdsByCategory,
    customTagsByCategory,
    simpleStoryTags,
    showTagsSkeleton,
    tagsByCategory,
    hasCategoryValidationError,
    isMaxSelectionReached,
    isCategoryUnlocked,
    isFirstCategory,
    isLastCategory,
    goToNextCategory,
    goToPreviousCategory,
    togglePredefinedTag,
    toggleCustomTag,
    addCustomTag,
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
                {activeCategoryConfig.description} (최대{' '}
                {activeCategoryConfig.maxSelectionCount}개)
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
        {TAG_CATEGORIES.map(({ value: category, label, placeholder }) => {
          const selectedTagIds = selectedTagIdsByCategory[category];
          const selectedCustomTagIds = selectedCustomTagIdsByCategory[category];

          return (
            <TabsContent
              key={category}
              value={category}
              className="p-4 pt-2 pb-6">
              <StoryTagCategorySection
                category={category}
                label={label}
                placeholder={placeholder}
                isMaxSelectionReached={isMaxSelectionReached(category)}
                selectedTagIds={selectedTagIds}
                selectedCustomTagIds={selectedCustomTagIds}
                predefinedTags={tagsByCategory[category]}
                customTags={customTagsByCategory[category]}
                isLoadingTags={showTagsSkeleton}
                hasTagsError={simpleStoryTags.isError}
                isGeneratingStorylines={isGeneratingStorylines}
                onTogglePredefinedTag={togglePredefinedTag}
                onToggleCustomTag={toggleCustomTag}
                onAddCustomTag={addCustomTag}
              />
            </TabsContent>
          );
        })}
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
