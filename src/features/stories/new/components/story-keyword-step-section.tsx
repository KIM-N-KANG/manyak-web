'use client';

import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  STORY_CREATE_STEP_PROGRESS_LABELS,
  TAG_CATEGORIES,
} from '../constants';
import { useStoryKeywordStep } from '../hooks/use-story-keyword-step';
import type { TagCategory } from '../types';
import { LoadingButtonContent } from './loading-button-content';
import { StoryCreateStepFooter } from './story-create-step-footer';
import { StoryCreateStepTitle } from './story-create-step-title';
import { StoryKeywordCategoryPanel } from './story-keyword-category-panel';

type StoryKeywordStepSectionProps = {
  isGeneratingStoryline: boolean;
  hasGenerateStorylineError: boolean;
  onGenerateStoryline: (request: GenerateSimpleStorylinesRequest) => void;
};

export function StoryKeywordStepSection({
  isGeneratingStoryline,
  hasGenerateStorylineError,
  onGenerateStoryline,
}: StoryKeywordStepSectionProps) {
  const {
    activeCategory,
    setActiveCategory,
    selectedTagIdsByCategory,
    selectedCustomKeywordIdsByCategory,
    customKeywordsByCategory,
    simpleStoryTags,
    tagsByCategory,
    canGenerateStoryline,
    getSelectedCount,
    togglePredefinedTag,
    toggleCustomKeyword,
    addCustomKeyword,
    handleGenerateStoryline,
  } = useStoryKeywordStep({
    isGeneratingStoryline,
    onGenerateStoryline,
  });

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-16">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <StoryCreateStepTitle
          titleLines={['만들고 싶은 스토리의', '키워드를 선택해주세요']}
          description="선택한 키워드로 AI가 스토리라인을 생성해요"
          className="p-4"
        />
        <Tabs
          className="min-h-0 flex-1 overflow-hidden"
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as TagCategory)}>
          <TabsList variant="line">
            {TAG_CATEGORIES.map(({ value, label, required }) => (
              <TabsTrigger key={value} value={value} className="gap-0.5">
                {label}
                {required && <span className="text-destructive">*</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          {TAG_CATEGORIES.map(
            ({ value: category, label, placeholder, maxSelectionCount }) => {
              const selectedTagIds = selectedTagIdsByCategory[category];
              const selectedCustomKeywordIds =
                selectedCustomKeywordIdsByCategory[category];

              return (
                <TabsContent
                  key={category}
                  value={category}
                  className="min-h-0">
                  <StoryKeywordCategoryPanel
                    category={category}
                    label={label}
                    placeholder={placeholder}
                    maxSelectionCount={maxSelectionCount}
                    selectedCount={getSelectedCount(category)}
                    selectedTagIds={selectedTagIds}
                    selectedCustomKeywordIds={selectedCustomKeywordIds}
                    predefinedTags={tagsByCategory[category]}
                    customKeywords={customKeywordsByCategory[category]}
                    isLoadingTags={simpleStoryTags.isLoading}
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
          <p className="px-4 text-sm text-destructive">
            스토리라인을 만들지 못했어요. 다시 시도해주세요
          </p>
        )}
      </section>

      <StoryCreateStepFooter
        progressLabel={STORY_CREATE_STEP_PROGRESS_LABELS.keyword}>
        <Button
          type="button"
          size="lg"
          className="relative"
          aria-busy={isGeneratingStoryline}
          disabled={!canGenerateStoryline || isGeneratingStoryline}
          onClick={handleGenerateStoryline}>
          <LoadingButtonContent
            isLoading={isGeneratingStoryline}
            loadingLabel="스토리라인 생성 중">
            스토리라인 만들기
          </LoadingButtonContent>
        </Button>
      </StoryCreateStepFooter>
    </main>
  );
}
