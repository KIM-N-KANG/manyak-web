'use client';

import { useState } from 'react';

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
import { ToggleChip } from '@/components/ui/toggle-chip';

import {
  ADDITIONAL_INFO_MAX_COUNT,
  ADDITIONAL_INFO_MAX_LENGTH,
} from '../constants';
import { useAdditionalInfos } from '../hooks/use-additional-infos';
import { LoadingButtonContent } from './loading-button-content';
import { SelectedStorylineContent } from './selected-storyline-content';
import { StoryCreateErrorMessage } from './story-create-error-message';
import { StoryCreateStepLayout } from './story-create-step-layout';

type StoryAdditionalInfoStepSectionProps = {
  storyline: SimpleStorylineResponse;
  isCompletingStory: boolean;
  hasCompleteStoryError: boolean;
  canCompleteStory: boolean;
  onCompleteStory: (additionalInfos: string[]) => void;
  onBackToStorylineSelect: () => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryAdditionalInfoStepSection({
  storyline,
  isCompletingStory,
  hasCompleteStoryError,
  canCompleteStory,
  onCompleteStory,
  onBackToStorylineSelect,
  onScroll,
}: StoryAdditionalInfoStepSectionProps) {
  const {
    additionalInfos,
    canAddAdditionalInfo,
    addAdditionalInfo,
    removeAdditionalInfo,
    changeAdditionalInfo,
    getSubmittedAdditionalInfos,
  } = useAdditionalInfos();

  const [selectedRecommendations, setSelectedRecommendations] = useState<
    Set<string>
  >(() => new Set());

  const toggleRecommendation = (recommendation: string, pressed: boolean) => {
    setSelectedRecommendations((previous) => {
      const next = new Set(previous);

      if (pressed) {
        next.add(recommendation);
      } else {
        next.delete(recommendation);
      }

      return next;
    });
  };

  const handleCompleteStory = () => {
    onCompleteStory([
      ...selectedRecommendations,
      ...getSubmittedAdditionalInfos(),
    ]);
  };

  return (
    <StoryCreateStepLayout
      titleLines={['스토리라인에 더하고 싶은', '정보를 자유롭게 입력해주세요']}
      description="입력한 정보는 스토리를 완성하는 데 반영돼요"
      onScroll={onScroll}
      footer={
        <>
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
        </>
      }>
      <div>
        <div className="flex flex-col">
          <SelectedStorylineContent story={storyline.story} />

          <section
            aria-labelledby="recommended-info-label"
            className="mt-4 flex flex-col gap-2 p-4">
            <Label>AI 추천 추가 정보</Label>
            <ul className="flex flex-col gap-2">
              {(storyline.recommendedInfos ?? []).map(
                (recommendedInfo, index) => {
                  const recommendation = recommendedInfo.text ?? '';

                  if (!recommendation) {
                    return null;
                  }

                  return (
                    <li key={recommendedInfo.id ?? index}>
                      <ToggleChip
                        className="h-auto w-full justify-start text-left whitespace-normal"
                        pressed={selectedRecommendations.has(recommendation)}
                        disabled={isCompletingStory}
                        onPressedChange={(pressed) =>
                          toggleRecommendation(recommendation, pressed)
                        }>
                        {recommendation}
                      </ToggleChip>
                    </li>
                  );
                },
              )}
            </ul>
          </section>

          <section
            aria-labelledby="additional-info-label"
            className="flex flex-col gap-2 p-4">
            <div className="flex items-baseline gap-1">
              <Label>추가 정보</Label>
              <p className="text-sm text-foreground-secondary">
                (최대 {ADDITIONAL_INFO_MAX_COUNT}개 입력)
              </p>
            </div>

            {additionalInfos.map((additionalInfo, index) => (
              <div key={additionalInfo.id} className="flex items-center gap-2">
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
              className="self-center"
              disabled={!canAddAdditionalInfo || isCompletingStory}
              onClick={addAdditionalInfo}>
              <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
              정보 추가
            </Button>
          </section>

          {hasCompleteStoryError && (
            <StoryCreateErrorMessage>
              스토리를 완성하지 못했어요. 잠시 후 다시 시도해주세요.
            </StoryCreateErrorMessage>
          )}
        </div>
      </div>
    </StoryCreateStepLayout>
  );
}
