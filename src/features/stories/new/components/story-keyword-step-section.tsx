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
import { StoryCreateStepFooter } from './story-create-step-footer';
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
    <main
      className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto pb-16"
      onScroll={onScroll}>
      <section className="flex flex-col">
        <StoryCreateStepTitle
          titleLines={['만들고 싶은 스토리의', '키워드를 선택해주세요']}
          description="선택한 키워드로 AI가 스토리라인을 생성해요"
          className="p-4"
        />
        <Tabs
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as TagCategory)}
          className="p-4">
          <TabsList>
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
                <TabsContent key={category} value={category}>
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
          <p className="text-sm text-destructive">
            스토리라인을 만들지 못했어요. 다시 시도해주세요
          </p>
        )}
      </section>

      <StoryCreateStepFooter
        progressLabel={STORY_CREATE_STEP_PROGRESS_LABELS.keyword}>
        <Button
          type="button"
          size="lg"
          disabled={!canGenerateStoryline || isGeneratingStoryline}
          onClick={handleGenerateStoryline}>
          스토리라인 만들기
        </Button>
      </StoryCreateStepFooter>
    </main>
  );
}
