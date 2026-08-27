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
import { getGenerateStorylinesErrorMessage } from '../../utils/generate-storylines-error-message';
import { StickyTabsList } from '../shared/sticky-tabs-list';
import { StoryCreateErrorMessage } from '../shared/story-create-error-message';
import { StoryCreateStepLayout } from '../step-layout/story-create-step-layout';
import { SelectedTagsDrawer } from './selected-tags-drawer';
import { StorylineRatingButtons } from './storyline-rating-buttons';
import { StorylineSelectLoading } from './storyline-select-loading';

export function StorylineSelectStepSection({
  storylines,
  creationId,
  selectedTagGroups,
  activeStorylineIndex,
  isGeneratingStorylines,
  hasGenerateStorylinesError,
  isGuestLimitReached,
  onActiveStorylineIndexChange,
  onRegenerateStorylines,
  onSelectStoryline,
  onScroll,
}: StorylineSelectStepSectionProps) {
  const selectedStoryline = isGeneratingStorylines
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
        isGeneratingStorylines
          ? ['스토리라인을 만들고 있어요', '잠시만 기다려 주세요']
          : ['마음에 드는', '스토리라인을 선택해주세요']
      }
      description={
        isGeneratingStorylines
          ? '키워드를 바탕으로 스토리라인을 구상하고 있어요'
          : '선택한 스토리라인이 스토리의 기본 흐름이 돼요'
      }
      onScroll={onScroll}
      footerTop={
        isGeneratingStorylines ? undefined : (
          <SelectedTagsDrawer
            groups={selectedTagGroups}
            creationId={creationId}
          />
        )
      }
      footer={
        isGeneratingStorylines ? undefined : (
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
      {isGeneratingStorylines ? (
        <StorylineSelectLoading />
      ) : (
        <Tabs
          value={String(activeStorylineIndex)}
          onValueChange={(value) => onActiveStorylineIndexChange(Number(value))}
          className="gap-0">
          <StickyTabsList
            variant="line"
            containerClassName="mt-0 px-0 py-0"
            className="w-full gap-0 border-b p-0">
            {storylines.length > 0
              ? storylines.map((storylineItem, index) => (
                  <TabsTrigger
                    key={storylineItem.id ?? index}
                    value={String(index)}
                    className="h-full rounded-none border-0 px-2 py-0 after:-bottom-px!">
                    {getStorylineTabLabel(index)}
                  </TabsTrigger>
                ))
              : Array.from({ length: EXPECTED_STORYLINE_COUNT }, (_, index) => (
                  <TabsTrigger
                    key={index}
                    value={String(index)}
                    disabled
                    className="h-full rounded-none border-0 px-2 py-0 after:-bottom-px!">
                    {getStorylineTabLabel(index)}
                  </TabsTrigger>
                ))}
          </StickyTabsList>
          {storylines.map((storylineItem, index) => (
            <TabsContent
              key={storylineItem.id ?? index}
              value={String(index)}
              className="px-4 pt-4 pb-8">
              <div className="flex h-full flex-col gap-4">
                <TextContent font="maruburi">
                  {storylineItem.storyline}
                </TextContent>
                <div className="flex justify-end">
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
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {!isGeneratingStorylines &&
        !hasGenerateStorylinesError &&
        storylines.length === 0 && (
          <p className="px-4 py-8 text-sm text-foreground-secondary">
            생성된 스토리라인이 없어요
          </p>
        )}
      {hasGenerateStorylinesError && (
        <StoryCreateErrorMessage className="px-4 pb-6">
          {getGenerateStorylinesErrorMessage({
            isGuestLimitReached,
            isRegeneration: storylines.length > 0,
          })}
        </StoryCreateErrorMessage>
      )}
    </StoryCreateStepLayout>
  );
}
