'use client';

import { useEffect, useRef } from 'react';

import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';

import {
  EXPECTED_STORYLINE_COUNT,
  getStorylineTabLabel,
} from '../../constants';
import { useStorylineRating } from '../../hooks/use-storyline-rating';
import type { StorylineSelectStepSectionProps } from '../../types';
import { StickyTabsList } from '../shared/sticky-tabs-list';
import { StoryCreateErrorMessage } from '../shared/story-create-error-message';
import { StoryCreateStepLayout } from '../step-layout/story-create-step-layout';
import { SelectedTagsDrawer } from '../storyline-step/selected-tags-drawer';
import { StorylineNavButtons } from '../storyline-step/storyline-nav-buttons';
import { StorylineRatingButtons } from '../storyline-step/storyline-rating-buttons';
import { StorylineSelectLoading } from '../storyline-step/storyline-select-loading';

export function StorylineSelectStepSection({
  storylines,
  creationId,
  selectedTagGroups,
  activeStorylineIndex,
  isRegeneratingStorylines,
  hasRegenerateStorylinesError,
  isGuestLimitReached,
  onActiveStorylineIndexChange,
  onRegenerateStorylines,
  onSelectStoryline,
  onScroll,
}: StorylineSelectStepSectionProps) {
  const selectedStoryline = isRegeneratingStorylines
    ? undefined
    : storylines[activeStorylineIndex];

  const { storylineRatings, toggleStorylineRating } = useStorylineRating();

  const scrollAreaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0 });
  }, [activeStorylineIndex]);

  const activeStorylineId = storylines[activeStorylineIndex]?.id;
  const activeRating =
    activeStorylineId === undefined
      ? undefined
      : storylineRatings[activeStorylineId];

  return (
    <StoryCreateStepLayout
      scrollAreaRef={scrollAreaRef}
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
        isRegeneratingStorylines ? undefined : (
          <>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={onRegenerateStorylines}>
              다시 만들기
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!selectedStoryline}
              onClick={onSelectStoryline}>
              선택하기
            </Button>
          </>
        )
      }>
      {isRegeneratingStorylines ? (
        <StorylineSelectLoading />
      ) : (
        <Tabs
          value={String(activeStorylineIndex)}
          onValueChange={(value) => onActiveStorylineIndexChange(Number(value))}
          className="gap-0">
          <StickyTabsList
            rightSlot={
              <SelectedTagsDrawer
                groups={selectedTagGroups}
                creationId={creationId}
              />
            }>
            {storylines.length > 0
              ? storylines.map((storylineItem, index) => (
                  <TabsTrigger
                    key={storylineItem.id ?? index}
                    value={String(index)}>
                    {getStorylineTabLabel(index)}
                  </TabsTrigger>
                ))
              : Array.from({ length: EXPECTED_STORYLINE_COUNT }, (_, index) => (
                  <TabsTrigger key={index} value={String(index)} disabled>
                    {getStorylineTabLabel(index)}
                  </TabsTrigger>
                ))}
          </StickyTabsList>
          {storylines.map((storylineItem, index) => (
            <TabsContent
              key={storylineItem.id ?? index}
              value={String(index)}
              className="p-4 pt-2 pb-6">
              <div className="flex h-full flex-col gap-4">
                <TextContent>{storylineItem.storyline}</TextContent>
                <div className="flex items-center justify-between">
                  <StorylineRatingButtons
                    rating={activeRating}
                    disabled={activeStorylineId === undefined}
                    onToggle={(rating) => {
                      if (activeStorylineId !== undefined) {
                        toggleStorylineRating(activeStorylineId, rating);
                      }
                    }}
                  />
                  <StorylineNavButtons
                    canGoPrev={index > 0}
                    canGoNext={index < storylines.length - 1}
                    onPrev={() => onActiveStorylineIndexChange(index - 1)}
                    onNext={() => onActiveStorylineIndexChange(index + 1)}
                  />
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {!isRegeneratingStorylines &&
        !hasRegenerateStorylinesError &&
        storylines.length === 0 && (
          <p className="px-4 py-8 text-sm text-foreground-secondary">
            생성된 스토리라인이 없어요
          </p>
        )}
      {hasRegenerateStorylinesError && (
        <StoryCreateErrorMessage className="px-4 pb-6">
          {isGuestLimitReached
            ? '게스트 스토리라인 생성 횟수를 모두 사용했어요'
            : '스토리라인을 다시 만들지 못했어요'}
        </StoryCreateErrorMessage>
      )}
    </StoryCreateStepLayout>
  );
}
