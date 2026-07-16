'use client';

import type { SimpleStorylineResponse } from '@/api/generated/models';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';

import type { AdditionalInfoInput } from '../../types';
import { SelectedStorylineContent } from '../shared/selected-storyline-content';
import { StoryCreateErrorMessage } from '../shared/story-create-error-message';
import { StoryCreateStepLayout } from '../step-layout/story-create-step-layout';
import { AdditionalInfoList } from './additional-info-list';
import { RecommendedInfoSection } from './recommended-info-section';

type StoryAdditionalInfoStepSectionProps = {
  storylineItem: SimpleStorylineResponse;
  isCompletingStory: boolean;
  hasCompleteStoryError: boolean;
  isGuestLimitReached: boolean;
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
  onRegisterAdditionalInfoInput: (
    id: string,
    element: HTMLTextAreaElement | null,
  ) => void;
  onCompleteStory: () => void;
  onBackToStorylineSelect: () => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryAdditionalInfoStepSection({
  storylineItem,
  isCompletingStory,
  hasCompleteStoryError,
  isGuestLimitReached,
  canCompleteStory,
  selectedRecommendations,
  additionalInfos,
  canAddAdditionalInfo,
  onToggleRecommendation,
  onAddAdditionalInfo,
  onRemoveAdditionalInfo,
  onChangeAdditionalInfo,
  onRegisterAdditionalInfoInput,
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
          <SelectedStorylineContent story={storylineItem.storyline} />

          <RecommendedInfoSection
            recommendedInfos={storylineItem.recommendedInfos ?? []}
            selectedRecommendations={selectedRecommendations}
            disabled={isCompletingStory}
            onToggleRecommendation={onToggleRecommendation}
          />

          <AdditionalInfoList
            additionalInfos={additionalInfos}
            canAddAdditionalInfo={canAddAdditionalInfo}
            disabled={isCompletingStory}
            onAddAdditionalInfo={onAddAdditionalInfo}
            onRemoveAdditionalInfo={onRemoveAdditionalInfo}
            onChangeAdditionalInfo={onChangeAdditionalInfo}
            onRegisterAdditionalInfoInput={onRegisterAdditionalInfoInput}
          />

          {hasCompleteStoryError && (
            <StoryCreateErrorMessage className="px-4 pb-6">
              {isGuestLimitReached
                ? '게스트 체험 횟수를 모두 사용했어요'
                : '스토리를 완성하지 못했어요'}
            </StoryCreateErrorMessage>
          )}
        </div>
      </div>
    </StoryCreateStepLayout>
  );
}
