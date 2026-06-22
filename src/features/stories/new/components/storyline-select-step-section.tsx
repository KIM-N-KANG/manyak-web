'use client';

import { ThumbsUpIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { STORYLINE_TAB_LABELS } from '../constants';
import { useHorizontalSwipe } from '../hooks/use-horizontal-swipe';
import { useStorylineRating } from '../hooks/use-storyline-rating';
import type { StorylineSelectStepSectionProps } from '../types';
import { StoryCreateStepFooter } from './story-create-step-footer';
import { StoryCreateStepScrollArea } from './story-create-step-scroll-area';
import { StoryCreateStepTitle } from './story-create-step-title';
import { StorylineSelectLoadingState } from './storyline-select-loading-state';

export function StorylineSelectStepSection({
  storylines,
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

  const { handleTouchStart, handleTouchEnd } = useHorizontalSwipe({
    onSwipeLeft: () => {
      if (activeStorylineIndex < storylines.length - 1) {
        onActiveStorylineIndexChange(activeStorylineIndex + 1);
      }
    },
    onSwipeRight: () => {
      if (activeStorylineIndex > 0) {
        onActiveStorylineIndexChange(activeStorylineIndex - 1);
      }
    },
  });

  return (
    <StoryCreateStepScrollArea onScroll={onScroll}>
      <section className="flex flex-col">
        <StoryCreateStepTitle
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
          className="p-4"
        />

        {isRegeneratingStorylines ? (
          <StorylineSelectLoadingState />
        ) : (
          <Tabs
            value={String(activeStorylineIndex)}
            onValueChange={(value) =>
              onActiveStorylineIndexChange(Number(value))
            }
            className="gap-0"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}>
            <div className="sticky -top-px z-10 mt-2 bg-background px-4 pt-2.25 pb-2">
              <TabsList>
                {storylines.map((storyline, index) => (
                  <TabsTrigger
                    key={storyline.id ?? index}
                    value={String(index)}>
                    {STORYLINE_TAB_LABELS[index]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {storylines.map((storyline, index) => (
              <TabsContent
                key={storyline.id ?? index}
                value={String(index)}
                className="p-4 pt-2">
                <div className="flex h-full flex-col gap-4">
                  <TextContent font="maruburi">{storyline.story}</TextContent>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant={
                        activeRating === 'GOOD' ? 'primaryOutline' : 'outline'
                      }
                      size="icon"
                      disabled={activeStorylineId === undefined}
                      aria-pressed={activeRating === 'GOOD'}
                      aria-label="이 스토리라인 좋아요"
                      onClick={() => {
                        if (activeStorylineId !== undefined) {
                          toggleStorylineRating(activeStorylineId, 'GOOD');
                        }
                      }}>
                      <HugeiconsIcon icon={ThumbsUpIcon} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant={
                        activeRating === 'BAD'
                          ? 'destructiveOutline'
                          : 'outline'
                      }
                      size="icon"
                      disabled={activeStorylineId === undefined}
                      aria-pressed={activeRating === 'BAD'}
                      aria-label="이 스토리라인 싫어요"
                      onClick={() => {
                        if (activeStorylineId !== undefined) {
                          toggleStorylineRating(activeStorylineId, 'BAD');
                        }
                      }}>
                      <HugeiconsIcon
                        icon={ThumbsUpIcon}
                        aria-hidden="true"
                        className="rotate-180"
                      />
                    </Button>
                  </div>
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
          <p className="px-4 text-sm text-destructive">
            스토리라인을 다시 만들지 못했어요. 잠시 후 다시 시도해주세요
          </p>
        )}
      </section>

      <StoryCreateStepFooter>
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
      </StoryCreateStepFooter>
    </StoryCreateStepScrollArea>
  );
}
