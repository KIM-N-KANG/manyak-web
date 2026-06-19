'use client';

import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { STORY_CREATE_STEP_PROGRESS_LABELS } from '../constants';
import type { StorylineSelectStepSectionProps } from '../types';
import { getStorylineTabValue } from '../utils/storyline-tabs';
import { StoryCreateStepFooter } from './story-create-step-footer';
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
  const isLoadingStorylines = isRegeneratingStorylines;
  const selectedStoryline = isLoadingStorylines
    ? undefined
    : storylines[activeStorylineIndex];

  return (
    <main
      className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto pb-16"
      onScroll={onScroll}>
      <section className="flex flex-col">
        <StoryCreateStepTitle
          titleLines={['마음에 드는', '스토리라인을 선택해주세요']}
          description="선택한 스토리라인이 스토리의 기본 흐름이 돼요"
          className="p-4"
        />

        {isLoadingStorylines ? (
          <StorylineSelectLoadingState />
        ) : (
          <Tabs
            value={getStorylineTabValue(activeStorylineIndex)}
            onValueChange={(value) =>
              onActiveStorylineIndexChange(Number(value))
            }
            className="p-4">
            <TabsList>
              {storylines.map((storyline, index) => (
                <TabsTrigger
                  key={storyline.id ?? index}
                  value={getStorylineTabValue(index)}>
                  {['첫 번째', '두 번째', '세 번째'][index]}
                </TabsTrigger>
              ))}
            </TabsList>
            {storylines.map((storyline, index) => (
              <TabsContent
                key={storyline.id ?? index}
                value={getStorylineTabValue(index)}>
                <div className="pb-4">
                  <TextContent font="maruburi">{storyline.story}</TextContent>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {!isLoadingStorylines && storylines.length === 0 && (
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

      <StoryCreateStepFooter
        progressLabel={STORY_CREATE_STEP_PROGRESS_LABELS['storyline-select']}>
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
          disabled={!selectedStoryline || isLoadingStorylines}
          onClick={onSelectStoryline}>
          선택하기
        </Button>
      </StoryCreateStepFooter>
    </main>
  );
}
