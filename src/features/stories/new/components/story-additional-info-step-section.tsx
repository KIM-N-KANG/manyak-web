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
import { ToggleChip } from '@/components/ui/toggle-chip';

import {
  ADDITIONAL_INFO_MAX_COUNT,
  ADDITIONAL_INFO_MAX_LENGTH,
  ADDITIONAL_INFO_PLACEHOLDERS,
} from '../constants';
import type { AdditionalInfoInput } from '../types';
import { LoadingButtonContent } from './loading-button-content';
import { SelectedStorylineContent } from './selected-storyline-content';
import { StoryCreateErrorMessage } from './story-create-error-message';
import { StoryCreateStepLayout } from './story-create-step-layout';

type StoryAdditionalInfoStepSectionProps = {
  storyline: SimpleStorylineResponse;
  isCompletingStory: boolean;
  hasCompleteStoryError: boolean;
  canCompleteStory: boolean;
  selectedRecommendations: Set<string>;
  additionalInfos: AdditionalInfoInput[];
  canAddAdditionalInfo: boolean;
  onToggleRecommendation: (recommendation: string, pressed: boolean) => void;
  onAddAdditionalInfo: () => void;
  onRemoveAdditionalInfo: (id: string) => void;
  onChangeAdditionalInfo: (
    id: string,
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  onCompleteStory: () => void;
  onBackToStorylineSelect: () => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryAdditionalInfoStepSection({
  storyline,
  isCompletingStory,
  hasCompleteStoryError,
  canCompleteStory,
  selectedRecommendations,
  additionalInfos,
  canAddAdditionalInfo,
  onToggleRecommendation,
  onAddAdditionalInfo,
  onRemoveAdditionalInfo,
  onChangeAdditionalInfo,
  onCompleteStory,
  onBackToStorylineSelect,
  onScroll,
}: StoryAdditionalInfoStepSectionProps) {
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
            onClick={onCompleteStory}>
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
            <Label>추천 추가 정보</Label>
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
                          onToggleRecommendation(recommendation, pressed)
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
            className="flex flex-col gap-2 p-4 pb-6">
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
                    placeholder={
                      ADDITIONAL_INFO_PLACEHOLDERS[
                        index % ADDITIONAL_INFO_PLACEHOLDERS.length
                      ]
                    }
                    rows={1}
                    value={additionalInfo.value}
                    disabled={isCompletingStory}
                    onChange={(event) =>
                      onChangeAdditionalInfo(additionalInfo.id, event)
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
                  onClick={() => onRemoveAdditionalInfo(additionalInfo.id)}
                  className="text-foreground-secondary">
                  <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              className="self-center"
              disabled={!canAddAdditionalInfo || isCompletingStory}
              onClick={onAddAdditionalInfo}>
              <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
              정보 추가
            </Button>
          </section>

          {hasCompleteStoryError && (
            <StoryCreateErrorMessage className="px-4 pb-6">
              스토리를 완성하지 못했어요. 잠시 후 다시 시도해주세요.
            </StoryCreateErrorMessage>
          )}
        </div>
      </div>
    </StoryCreateStepLayout>
  );
}
