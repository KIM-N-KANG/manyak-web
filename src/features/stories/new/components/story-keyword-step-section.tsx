'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleChip } from '@/components/ui/toggle-chip';

import { SKELETON_TAG_CHIP_WIDTH_CLASSES, TAG_CATEGORIES } from '../constants';
import { useStoryKeywordStep } from '../hooks/use-story-keyword-step';
import type { TagCategory } from '../types';
import { AddKeywordDialog } from './add-keyword-dialog';

export function StoryKeywordStepSection() {
  const {
    activeCategory,
    setActiveCategory,
    selectedTagIdsByCategory,
    selectedCustomKeywordIdsByCategory,
    customKeywordsByCategory,
    simpleStoryTags,
    generateStorylines,
    tagsByCategory,
    canGenerateStoryline,
    getSelectedCount,
    togglePredefinedTag,
    toggleCustomKeyword,
    addCustomKeyword,
    handleGenerateStoryline,
  } = useStoryKeywordStep();

  return (
    <main className="flex flex-1 flex-col pb-16">
      <section className="flex flex-1 flex-col">
        <Tabs
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
                <TabsContent key={category} value={category}>
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
                        if (tag.tagId == null || !tag.name) {
                          return null;
                        }

                        const isSelected = selectedTagIds.includes(tag.tagId);
                        const isKeywordChipDisabled =
                          generateStorylines.isPending ||
                          (!isSelected && isMaxSelectionReached);

                        return (
                          <ToggleChip
                            key={tag.tagId}
                            pressed={isSelected}
                            disabled={isKeywordChipDisabled}
                            onPressedChange={(pressed) =>
                              togglePredefinedTag(
                                category,
                                tag.tagId as number,
                                pressed,
                              )
                            }>
                            {tag.name}
                          </ToggleChip>
                        );
                      })}
                      {customKeywordsByCategory[category].map((keyword) => {
                        const isSelected = selectedCustomKeywordIds.includes(
                          keyword.id,
                        );
                        const isKeywordChipDisabled =
                          generateStorylines.isPending ||
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
                        disabled={isMaxSelectionReached}
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
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
        <div className="flex h-full w-full items-center justify-between">
          <p className="text-sm font-medium">1 / 3</p>
          <Button
            type="button"
            size="lg"
            className="relative"
            aria-busy={generateStorylines.isPending}
            disabled={!canGenerateStoryline || generateStorylines.isPending}
            onClick={handleGenerateStoryline}>
            <span
              aria-hidden={generateStorylines.isPending}
              className={
                generateStorylines.isPending ? 'invisible' : undefined
              }>
              스토리라인 만들기
            </span>
            {generateStorylines.isPending && (
              <Spinner className="absolute" aria-label="스토리라인 생성 중" />
            )}
          </Button>
        </div>
      </nav>
    </main>
  );
}
