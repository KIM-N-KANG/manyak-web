'use client';

import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TAG_CATEGORIES } from '../constants';
import { useStoryKeywordStep } from '../hooks/use-story-keyword-step';
import type { TagCategory } from '../types';
import { StoryCreateStepFooter } from './story-create-step-footer';
import { StoryCreateStepScrollArea } from './story-create-step-scroll-area';
import { StoryCreateStepTitle } from './story-create-step-title';
import { StoryKeywordCategoryPanel } from './story-keyword-category-panel';

type StoryKeywordStepSectionProps = {
  isGeneratingStoryline: boolean;
  hasGenerateStorylineError: boolean;
  onGenerateStoryline: (request: GenerateSimpleStorylinesRequest) => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryKeywordStepSection({
  isGeneratingStoryline,
  hasGenerateStorylineError,
  onGenerateStoryline,
  onScroll,
}: StoryKeywordStepSectionProps) {
  const {
    activeCategory,
    setActiveCategory,
    selectedTagIdsByCategory,
    selectedCustomKeywordIdsByCategory,
    customKeywordsByCategory,
    simpleStoryTags,
    showTagsSkeleton,
    tagsByCategory,
    canGenerateStoryline,
    isMaxSelectionReached,
    isCategoryUnlocked,
    isCategoryComplete,
    isFirstCategory,
    isLastCategory,
    goToNextCategory,
    goToPreviousCategory,
    handleTouchStart,
    handleTouchEnd,
    togglePredefinedTag,
    toggleCustomKeyword,
    addCustomKeyword,
    handleGenerateStoryline,
  } = useStoryKeywordStep({
    isGeneratingStoryline,
    onGenerateStoryline,
  });

  return (
    <StoryCreateStepScrollArea onScroll={onScroll}>
      <section className="flex flex-col">
        <StoryCreateStepTitle
          titleLines={['만들고 싶은 스토리의', '키워드를 선택해주세요']}
          description="선택한 키워드로 AI가 스토리라인을 생성해요"
          className="p-4"
        />
        <Tabs
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as TagCategory)}
          className="gap-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}>
          <div className="sticky -top-px z-10 mt-2 bg-background px-4 pt-2.25 pb-2">
            <TabsList>
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
            </TabsList>
          </div>
          {TAG_CATEGORIES.map(
            ({ value: category, label, placeholder, maxSelectionCount }) => {
              const selectedTagIds = selectedTagIdsByCategory[category];
              const selectedCustomKeywordIds =
                selectedCustomKeywordIdsByCategory[category];

              return (
                <TabsContent key={category} value={category} className="p-4">
                  <StoryKeywordCategoryPanel
                    category={category}
                    label={label}
                    placeholder={placeholder}
                    maxSelectionCount={maxSelectionCount}
                    isMaxSelectionReached={isMaxSelectionReached(category)}
                    selectedTagIds={selectedTagIds}
                    selectedCustomKeywordIds={selectedCustomKeywordIds}
                    predefinedTags={tagsByCategory[category]}
                    customKeywords={customKeywordsByCategory[category]}
                    isLoadingTags={showTagsSkeleton}
                    hasTagsError={simpleStoryTags.isError}
                    isGeneratingStoryline={isGeneratingStoryline}
                    onTogglePredefinedTag={togglePredefinedTag}
                    onToggleCustomKeyword={toggleCustomKeyword}
                    onAddCustomKeyword={addCustomKeyword}
                  />
                </TabsContent>
              );
            },
          )}
        </Tabs>
        {hasGenerateStorylineError && (
          <p className="text-sm text-destructive">
            스토리라인을 만들지 못했어요. 다시 시도해주세요
          </p>
        )}
      </section>

      <StoryCreateStepFooter>
        {!isFirstCategory && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={isGeneratingStoryline}
            onClick={goToPreviousCategory}>
            이전
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          disabled={
            isGeneratingStoryline ||
            (isLastCategory
              ? !canGenerateStoryline
              : !isCategoryComplete(activeCategory))
          }
          onClick={isLastCategory ? handleGenerateStoryline : goToNextCategory}>
          {isLastCategory ? '스토리라인 만들기' : '다음'}
        </Button>
      </StoryCreateStepFooter>
    </StoryCreateStepScrollArea>
  );
}
