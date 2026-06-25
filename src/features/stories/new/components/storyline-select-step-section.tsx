'use client';

import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { ONBOARDING_TARGET } from '@/features/onboarding/constants';

import { getStorylineTabLabel } from '../constants';
import { useStorylineRating } from '../hooks/use-storyline-rating';
import { useSwipeableIndex } from '../hooks/use-swipeable-index';
import type { StorylineSelectStepSectionProps } from '../types';
import { SelectedKeywordsSummary } from './selected-keywords-summary';
import { StickyTabsList } from './sticky-tabs-list';
import { StoryCreateErrorMessage } from './story-create-error-message';
import { StoryCreateStepLayout } from './story-create-step-layout';
import { StorylineRatingButtons } from './storyline-rating-buttons';
import { StorylineSelectLoadingState } from './storyline-select-loading-state';

export function StorylineSelectStepSection({
  storylines,
  selectedKeywords,
  activeStorylineIndex,
  isRegeneratingStorylines,
  hasRegenerateStorylinesError,
  onActiveStorylineIndexChange,
  onRegenerateStorylines,
  onSelectStoryline,
  onScroll,
}: StorylineSelectStepSectionProps) {
  const selectedStoryline = isRegeneratingStorylines
    ? undefined
    : storylines[activeStorylineIndex];

  const { storylineRatings, toggleStorylineRating } = useStorylineRating();

  const activeStorylineId = storylines[activeStorylineIndex]?.id;
  const activeRating =
    activeStorylineId === undefined
      ? undefined
      : storylineRatings[activeStorylineId];

  const { handleTouchStart, handleTouchEnd } = useSwipeableIndex({
    index: activeStorylineIndex,
    count: storylines.length,
    onIndexChange: onActiveStorylineIndexChange,
  });

  return (
    <StoryCreateStepLayout
      titleLines={
        isRegeneratingStorylines
          ? ['스토리라인을 만들고 있어요', '잠시만 기다려 주세요']
          : ['마음에 드는', '스토리라인을 선택해주세요']
      }
      description={
        isRegeneratingStorylines
          ? '키워드를 바탕으로 스토리라인을 구상하고 있어요'
          : '선택한 스토리라인이 스토리의 기본 흐름이 돼요'
      }
      onScroll={onScroll}
      footer={
        <>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={isRegeneratingStorylines}
            onClick={onRegenerateStorylines}>
            다시 만들기
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!selectedStoryline || isRegeneratingStorylines}
            onClick={onSelectStoryline}>
            선택하기
          </Button>
        </>
      }>
      <SelectedKeywordsSummary keywords={selectedKeywords} />
      {isRegeneratingStorylines ? (
        <StorylineSelectLoadingState />
      ) : (
        <Tabs
          value={String(activeStorylineIndex)}
          onValueChange={(value) => onActiveStorylineIndexChange(Number(value))}
          className="gap-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}>
          <StickyTabsList data-onborda={ONBOARDING_TARGET.STORYLINE_TABS}>
            {storylines.map((storyline, index) => (
              <TabsTrigger key={storyline.id ?? index} value={String(index)}>
                {getStorylineTabLabel(index)}
              </TabsTrigger>
            ))}
          </StickyTabsList>
          {storylines.map((storyline, index) => (
            <TabsContent
              key={storyline.id ?? index}
              value={String(index)}
              className="p-4 pt-2">
              <div className="flex h-full flex-col gap-4">
                <TextContent font="maruburi">{storyline.story}</TextContent>
                <StorylineRatingButtons
                  rating={activeRating}
                  disabled={activeStorylineId === undefined}
                  onToggle={(rating) => {
                    if (activeStorylineId !== undefined) {
                      toggleStorylineRating(activeStorylineId, rating);
                    }
                  }}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {!isRegeneratingStorylines && storylines.length === 0 && (
        <p className="px-4 py-8 text-sm text-foreground-secondary">
          생성된 스토리라인이 없어요. 잠시 후 다시 시도해주세요
        </p>
      )}
      {hasRegenerateStorylinesError && (
        <StoryCreateErrorMessage className="px-4">
          스토리라인을 다시 만들지 못했어요. 잠시 후 다시 시도해주세요
        </StoryCreateErrorMessage>
      )}
    </StoryCreateStepLayout>
  );
}
