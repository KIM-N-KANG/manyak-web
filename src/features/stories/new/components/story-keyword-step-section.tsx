'use client';

import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleChip } from '@/components/ui/toggle-chip';

import { SKELETON_TAG_CHIP_WIDTH_CLASSES, TAG_CATEGORIES } from '../constants';
import { useStoryKeywordStep } from '../hooks/use-story-keyword-step';
import type { TagCategory } from '../types';
import { AddKeywordDialog } from './add-keyword-dialog';
import { StoryCreateTitle } from './story-create-title';

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
        <StoryCreateTitle />
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
              const selectedCount = getSelectedCount(category);
              const isMaxSelectionReached = selectedCount >= maxSelectionCount;

              return (
                <TabsContent
                  key={category}
                  value={category}
                  className="min-h-0 overflow-y-auto">
                  <div className="flex flex-col gap-4 px-4 pb-4">
                    <p className="text-sm text-foreground-secondary">
                      최대 {maxSelectionCount}개까지 선택할 수 있어요
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {simpleStoryTags.isLoading && (
                        <>
                          {SKELETON_TAG_CHIP_WIDTH_CLASSES.map(
                            (widthClass, index) => (
                              <Skeleton
                                key={`${category}-tag-skeleton-${index}`}
                                className={`h-10 ${widthClass}`}
                                aria-hidden="true"
                              />
                            ),
                          )}
                        </>
                      )}
                      {simpleStoryTags.isError && (
                        <p className="py-2 text-sm text-destructive">
                          키워드를 불러오지 못했어요
                        </p>
                      )}
                      {tagsByCategory[category].map((tag) => {
                        const { tagId, name } = tag;

                        if (tagId == null || !name) {
                          return null;
                        }

                        const isSelected = selectedTagIds.includes(tagId);
                        const isKeywordChipDisabled =
                          isGeneratingStoryline ||
                          (!isSelected && isMaxSelectionReached);

                        return (
                          <ToggleChip
                            key={tagId}
                            pressed={isSelected}
                            disabled={isKeywordChipDisabled}
                            onPressedChange={(pressed) =>
                              togglePredefinedTag(category, tagId, pressed)
                            }>
                            {name}
                          </ToggleChip>
                        );
                      })}
                      {customKeywordsByCategory[category].map((keyword) => {
                        const isSelected = selectedCustomKeywordIds.includes(
                          keyword.id,
                        );
                        const isKeywordChipDisabled =
                          isGeneratingStoryline ||
                          (!isSelected && isMaxSelectionReached);

                        return (
                          <ToggleChip
                            key={keyword.id}
                            pressed={isSelected}
                            disabled={isKeywordChipDisabled}
                            onPressedChange={(pressed) =>
                              toggleCustomKeyword(category, keyword.id, pressed)
                            }>
                            {keyword.name}
                          </ToggleChip>
                        );
                      })}
                      <AddKeywordDialog
                        category={category}
                        categoryLabel={label}
                        placeholder={placeholder}
                        disabled={
                          isGeneratingStoryline || isMaxSelectionReached
                        }
                        onAddKeyword={(keyword) =>
                          addCustomKeyword(category, keyword)
                        }
                      />
                    </div>
                  </div>
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

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
        <div className="flex h-full w-full items-center justify-between">
          <p className="text-sm font-medium">1 / 3</p>
          <Button
            type="button"
            size="lg"
            className="relative"
            aria-busy={isGeneratingStoryline}
            disabled={!canGenerateStoryline || isGeneratingStoryline}
            onClick={handleGenerateStoryline}>
            <span
              aria-hidden={isGeneratingStoryline}
              className={isGeneratingStoryline ? 'invisible' : undefined}>
              스토리라인 만들기
            </span>
            {isGeneratingStoryline && (
              <Spinner className="absolute" aria-label="스토리라인 생성 중" />
            )}
          </Button>
        </div>
      </nav>
    </main>
  );
}
