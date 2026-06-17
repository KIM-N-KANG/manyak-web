'use client';

import type { SimpleStorylineResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { STORY_CREATE_STEP_PROGRESS_LABELS } from '../constants';
import { LoadingButtonContent } from './loading-button-content';
import { StoryCreateStepFooter } from './story-create-step-footer';
import { StoryCreateStepTitle } from './story-create-step-title';
import { StorylineText } from './storyline-text';

type StorylineSelectStepSectionProps = {
  storylines: SimpleStorylineResponse[];
  activeStorylineIndex: number;
  isRegeneratingStorylines: boolean;
  hasRegenerateStorylinesError: boolean;
  onActiveStorylineIndexChange: (index: number) => void;
  onRegenerateStorylines: () => void;
  onSelectStoryline: () => void;
};

const getStorylineTabValue = (index: number) => String(index);

export function StorylineSelectStepSection({
  storylines,
  activeStorylineIndex,
  isRegeneratingStorylines,
  hasRegenerateStorylinesError,
  onActiveStorylineIndexChange,
  onRegenerateStorylines,
  onSelectStoryline,
}: StorylineSelectStepSectionProps) {
  const selectedStoryline = storylines[activeStorylineIndex];

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-16">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <StoryCreateStepTitle
          titleLines={['마음에 드는', '스토리라인을 선택해주세요']}
          description="선택한 스토리라인을 바탕으로 스토리를 완성해드릴게요"
          className="p-4"
        />

        <Tabs
          className="min-h-0 flex-1 overflow-hidden"
          value={getStorylineTabValue(activeStorylineIndex)}
          onValueChange={(value) =>
            onActiveStorylineIndexChange(Number(value))
          }>
          <TabsList variant="line">
            {storylines.map((storyline, index) => (
              <TabsTrigger
                key={storyline.id ?? index}
                value={getStorylineTabValue(index)}>
                {index + 1}
              </TabsTrigger>
            ))}
          </TabsList>
          {storylines.map((storyline, index) => (
            <TabsContent
              key={storyline.id ?? index}
              value={getStorylineTabValue(index)}
              className="min-h-0">
              <div className="h-full overflow-y-auto">
                <div className="px-4 pb-4">
                  <StorylineText>{storyline.story}</StorylineText>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {storylines.length === 0 && (
          <p className="px-4 py-8 text-sm text-foreground-secondary">
            생성된 스토리라인이 없어요. 다시 만들어주세요
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
          className="relative"
          aria-busy={isRegeneratingStorylines}
          disabled={isRegeneratingStorylines}
          onClick={onRegenerateStorylines}>
          <LoadingButtonContent
            isLoading={isRegeneratingStorylines}
            loadingLabel="스토리라인 생성 중">
            다시 만들기
          </LoadingButtonContent>
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={!selectedStoryline || isRegeneratingStorylines}
          onClick={onSelectStoryline}>
          이 스토리라인 선택하기
        </Button>
      </StoryCreateStepFooter>
    </main>
  );
}
