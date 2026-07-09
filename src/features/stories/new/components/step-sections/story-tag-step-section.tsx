'use client';

import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';

import { TAG_CATEGORIES } from '../../constants';
import { useStoryTagStep } from '../../hooks/use-story-tag-step';
import type { TagCategory } from '../../types';
import { StickyTabsList } from '../shared/sticky-tabs-list';
import { StoryCreateErrorMessage } from '../shared/story-create-error-message';
import { StoryCreateStepLayout } from '../step-layout/story-create-step-layout';
import { StoryTagCategorySection } from '../tag-step/story-tag-category-section';

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
    canGenerateStorylines,
    isMaxSelectionReached,
    isCategoryUnlocked,
    isCategoryComplete,
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

  return (
    <StoryCreateStepLayout
      titleLines={['만들고 싶은 스토리의', '키워드를 선택해주세요']}
      description="선택한 키워드로 AI가 스토리라인을 생성해요"
      onScroll={onScroll}
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
            disabled={
              isGeneratingStorylines ||
              (isLastCategory
                ? !canGenerateStorylines
                : !isCategoryComplete(activeCategory))
            }
            onClick={
              isLastCategory ? handleGenerateStorylines : goToNextCategory
            }>
            {isLastCategory ? '스토리라인 만들기' : '다음'}
          </Button>
        </>
      }>
      <Tabs
        value={activeCategory}
        onValueChange={(value) => changeCategory(value as TagCategory)}
        className="gap-0">
        <StickyTabsList>
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
        {TAG_CATEGORIES.map(
          ({ value: category, label, placeholder, maxSelectionCount }) => {
            const selectedTagIds = selectedTagIdsByCategory[category];
            const selectedCustomTagIds =
              selectedCustomTagIdsByCategory[category];

            return (
              <TabsContent
                key={category}
                value={category}
                className="p-4 pt-2 pb-6">
                <StoryTagCategorySection
                  category={category}
                  label={label}
                  placeholder={placeholder}
                  maxSelectionCount={maxSelectionCount}
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
          },
        )}
      </Tabs>
      {hasGenerateStorylinesError && (
        <StoryCreateErrorMessage className="px-4">
          {isGuestLimitReached
            ? '게스트 스토리라인 생성 횟수를 모두 사용했어요. 로그인하면 계속 만들 수 있어요.'
            : '스토리라인을 만들지 못했어요. 잠시 후 다시 시도해주세요.'}
        </StoryCreateErrorMessage>
      )}
    </StoryCreateStepLayout>
  );
}
