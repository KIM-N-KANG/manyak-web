'use client';

import { type ChangeEvent, useState } from 'react';

import { Cancel01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { SimpleStorylineResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';

import {
  ADDITIONAL_INFO_MAX_COUNT,
  ADDITIONAL_INFO_MAX_LENGTH,
} from '../constants';

type AdditionalInfoInput = {
  id: string;
  value: string;
};

type StoryAdditionalInfoStepSectionProps = {
  storyline: SimpleStorylineResponse;
  isCompletingStory: boolean;
  hasCompleteStoryError: boolean;
  canCompleteStory: boolean;
  onCompleteStory: (additionalInfos: string[]) => void;
  onBackToStorylineSelect: () => void;
};

export function StoryAdditionalInfoStepSection({
  storyline,
  isCompletingStory,
  hasCompleteStoryError,
  canCompleteStory,
  onCompleteStory,
  onBackToStorylineSelect,
}: StoryAdditionalInfoStepSectionProps) {
  const [additionalInfos, setAdditionalInfos] = useState<AdditionalInfoInput[]>(
    [],
  );

  const handleAddAdditionalInfo = () => {
    if (additionalInfos.length >= ADDITIONAL_INFO_MAX_COUNT) {
      return;
    }

    setAdditionalInfos((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        value: '',
      },
    ]);
  };

  const handleRemoveAdditionalInfo = (id: string) => {
    setAdditionalInfos((previous) =>
      previous.filter((additionalInfo) => additionalInfo.id !== id),
    );
  };

  const handleAdditionalInfoChange = (
    id: string,
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const nextValue = event.target.value.slice(0, ADDITIONAL_INFO_MAX_LENGTH);

    setAdditionalInfos((previous) =>
      previous.map((additionalInfo) =>
        additionalInfo.id === id
          ? { ...additionalInfo, value: nextValue }
          : additionalInfo,
      ),
    );
  };

  const handleCompleteStory = () => {
    const submittedAdditionalInfos = additionalInfos
      .map(({ value }) => value.trim())
      .filter(Boolean);

    onCompleteStory(submittedAdditionalInfos);
  };

  const canAddAdditionalInfo =
    additionalInfos.length < ADDITIONAL_INFO_MAX_COUNT && !isCompletingStory;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-20">
      <section className="flex min-h-0 flex-1 flex-col gap-8 overflow-hidden px-4 py-4">
        <div className="flex flex-col gap-1">
          <div className="text-xl font-semibold">
            <p>스토리를 더 풍성하게 만들</p>
            <p>정보를 추가해주세요</p>
          </div>
          <p className="text-foreground-secondary">
            추천 질문에 답하거나, 떠오르는 내용을 자유롭게 적어주세요
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-8 pb-4">
            <p className="font-maruburi text-base leading-loose">
              {storyline.story}
            </p>

            <section
              aria-labelledby="story-help-questions"
              className="flex flex-col gap-2">
              <Label>AI 추천 질문</Label>
              <ul className="flex flex-col gap-2 text-sm">
                {(storyline.helpQuestions ?? []).map((helpQuestion, index) => (
                  <li key={helpQuestion.id ?? index}>
                    {helpQuestion.question}
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="additional-info-label"
              className="flex flex-col gap-2">
              <div className="flex items-baseline gap-1">
                <Label>추가 정보</Label>
                <p className="text-sm text-foreground-secondary">
                  (최대 {ADDITIONAL_INFO_MAX_COUNT}개 입력)
                </p>
              </div>

              {additionalInfos.map((additionalInfo, index) => (
                <div
                  key={additionalInfo.id}
                  className="flex items-center gap-2">
                  <InputGroup>
                    <InputGroupTextarea
                      aria-label={`추가 정보 ${index + 1}`}
                      maxLength={ADDITIONAL_INFO_MAX_LENGTH}
                      value={additionalInfo.value}
                      disabled={isCompletingStory}
                      onChange={(event) =>
                        handleAdditionalInfoChange(additionalInfo.id, event)
                      }
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText>
                        {additionalInfo.value.length}/
                        {ADDITIONAL_INFO_MAX_LENGTH}
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`추가 정보 ${index + 1} 삭제`}
                    disabled={isCompletingStory}
                    onClick={() =>
                      handleRemoveAdditionalInfo(additionalInfo.id)
                    }>
                    <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="secondary"
                className="self-center text-foreground-secondary"
                aria-hidden="true"
                aria-label="정보 추가"
                disabled={!canAddAdditionalInfo}
                onClick={handleAddAdditionalInfo}>
                <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
                정보 추가
              </Button>
            </section>

            {hasCompleteStoryError && (
              <p className="text-sm text-destructive">
                스토리를 완성하지 못했어요. 다시 시도해주세요
              </p>
            )}
          </div>
        </ScrollArea>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
        <div className="flex h-full w-full items-center justify-between gap-4">
          <p className="text-sm font-medium">3 / 3</p>
          <div className="flex min-w-0 flex-1 justify-end gap-2">
            <Button
              type="button"
              size="lg"
              variant="secondary"
              disabled={isCompletingStory}
              onClick={onBackToStorylineSelect}>
              다시 선택하기
            </Button>
            <Button
              type="button"
              size="lg"
              className="relative"
              aria-busy={isCompletingStory}
              disabled={!canCompleteStory || isCompletingStory}
              onClick={handleCompleteStory}>
              <span
                aria-hidden={isCompletingStory}
                className={isCompletingStory ? 'invisible' : undefined}>
                스토리 완성하기
              </span>
              {isCompletingStory && (
                <Spinner className="absolute" aria-label="스토리 완성 중" />
              )}
            </Button>
          </div>
        </div>
      </nav>
    </main>
  );
}
