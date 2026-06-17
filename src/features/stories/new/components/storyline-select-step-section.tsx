'use client';

import type { SimpleStorylineResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <main className="flex flex-1 flex-col pb-16">
      <section className="flex flex-1 flex-col">
        <div className="flex flex-col items-start gap-1 p-4 pb-8">
          <div className="text-xl font-semibold">
            <p>마음에 드는</p>
            <p>스토리라인을 선택해주세요</p>
          </div>
          <p className="text-foreground-secondary">
            선택한 스토리라인을 바탕으로 스토리를 완성해드릴게요
          </p>
        </div>

        <Tabs
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
              className="px-4 pb-4">
              <p className="font-maruburi text-base leading-loose">
                {storyline.story}
              </p>
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

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
        <div className="flex h-full w-full items-center justify-between gap-4">
          <p className="text-sm font-medium">2 / 3</p>
          <div className="flex min-w-0 flex-1 justify-end gap-2">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="relative"
              aria-busy={isRegeneratingStorylines}
              disabled={isRegeneratingStorylines}
              onClick={onRegenerateStorylines}>
              <span
                aria-hidden={isRegeneratingStorylines}
                className={isRegeneratingStorylines ? 'invisible' : undefined}>
                다시 만들기
              </span>
              {isRegeneratingStorylines && (
                <Spinner className="absolute" aria-label="스토리라인 생성 중" />
              )}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={!selectedStoryline || isRegeneratingStorylines}
              onClick={onSelectStoryline}>
              이 스토리라인 선택하기
            </Button>
          </div>
        </div>
      </nav>
    </main>
  );
}
