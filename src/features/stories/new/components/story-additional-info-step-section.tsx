'use client';

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

import {
  ADDITIONAL_INFO_MAX_COUNT,
  ADDITIONAL_INFO_MAX_LENGTH,
  STORY_CREATE_STEP_PROGRESS_LABELS,
} from '../constants';
import { useAdditionalInfos } from '../hooks/use-additional-infos';
import { LoadingButtonContent } from './loading-button-content';
import { StoryCreateStepFooter } from './story-create-step-footer';
import { StoryCreateStepTitle } from './story-create-step-title';
import { StorylineText } from './storyline-text';

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
  const {
    additionalInfos,
    canAddAdditionalInfo,
    addAdditionalInfo,
    removeAdditionalInfo,
    changeAdditionalInfo,
    getSubmittedAdditionalInfos,
  } = useAdditionalInfos();

  const handleCompleteStory = () => {
    onCompleteStory(getSubmittedAdditionalInfos());
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-16">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <StoryCreateStepTitle
          titleLines={['스토리에 더하고 싶은', '내용을 입력해주세요']}
          description="입력한 내용은 스토리를 완성하는 데 반영돼요"
          className="border-b border-border p-4"
        />

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-8">
            <StorylineText>{storyline.story}</StorylineText>

            <section
              aria-labelledby="story-help-questions"
              className="flex flex-col gap-2">
              <Label>AI 추천 질문</Label>
              <ul className="flex flex-col gap-2">
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
                      className="min-h-10"
                      maxLength={ADDITIONAL_INFO_MAX_LENGTH}
                      placeholder="예: 주인공은 오래전 친구를 배신한 비밀을 숨기고 있다"
                      rows={1}
                      value={additionalInfo.value}
                      disabled={isCompletingStory}
                      onChange={(event) =>
                        changeAdditionalInfo(additionalInfo.id, event)
                      }
                    />
                    <InputGroupAddon align="block-end">
                      <InputGroupText>
                        {additionalInfo.value.length} /{' '}
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
                    onClick={() => removeAdditionalInfo(additionalInfo.id)}>
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
                disabled={!canAddAdditionalInfo || isCompletingStory}
                onClick={addAdditionalInfo}>
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
        </div>
      </section>

      <StoryCreateStepFooter
        progressLabel={STORY_CREATE_STEP_PROGRESS_LABELS['additional-info']}>
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
          <LoadingButtonContent
            isLoading={isCompletingStory}
            loadingLabel="스토리 완성 중">
            스토리 완성하기
          </LoadingButtonContent>
        </Button>
      </StoryCreateStepFooter>
    </main>
  );
}
