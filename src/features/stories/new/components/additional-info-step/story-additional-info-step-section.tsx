'use client';

import type { SimpleStorylineResponse } from '@/api/generated/models';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';

import { ART_STYLE_REQUIRED_ERROR } from '../../constants';
import type { AdditionalInfoInput } from '../../types';
import { SelectedStorylineContent } from '../shared/selected-storyline-content';
import { StoryCreateErrorMessage } from '../shared/story-create-error-message';
import { StoryCreateStepLayout } from '../step-layout/story-create-step-layout';
import { AdditionalInfoList } from './additional-info-list';
import { ArtStyleSelectSection } from './art-style-select-section';
import { RecommendedInfoSection } from './recommended-info-section';
import { StoryCompletionCreditCost } from './story-completion-credit-cost';

type StoryAdditionalInfoStepSectionProps = {
  storylineItem: SimpleStorylineResponse;
  isCompletingStory: boolean;
  hasCompleteStoryError: boolean;
  canCompleteStory: boolean;
  selectedRecommendations: Set<string>;
  additionalInfos: AdditionalInfoInput[];
  canAddAdditionalInfo: boolean;
  artStyle: string | null;
  hasArtStyleError: boolean;
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
  onArtStyleChange: (code: string) => void;
  onCompleteStory: () => void;
  onBackToStorylineSelect: () => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryAdditionalInfoStepSection({
  storylineItem,
  isCompletingStory,
  hasCompleteStoryError,
  canCompleteStory,
  selectedRecommendations,
  additionalInfos,
  canAddAdditionalInfo,
  artStyle,
  hasArtStyleError,
  onToggleRecommendation,
  onAddAdditionalInfo,
  onRemoveAdditionalInfo,
  onChangeAdditionalInfo,
  onRegisterAdditionalInfoInput,
  onArtStyleChange,
  onCompleteStory,
  onBackToStorylineSelect,
  onScroll,
}: StoryAdditionalInfoStepSectionProps) {
  return (
    <StoryCreateStepLayout
      titleLines={['스토리라인에 더하고 싶은', '정보를 자유롭게 입력해주세요']}
      description="입력한 정보는 스토리를 완성하는 데 반영돼요"
      onScroll={onScroll}
      footerTop={<StoryCompletionCreditCost />}
      footerMessage={
        hasArtStyleError ? (
          <StoryCreateErrorMessage>
            {ART_STYLE_REQUIRED_ERROR}
          </StoryCreateErrorMessage>
        ) : null
      }
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
        <div className="flex flex-col gap-6 pb-4">
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

          <ArtStyleSelectSection
            value={artStyle}
            disabled={isCompletingStory}
            onValueChange={onArtStyleChange}
          />

          {hasCompleteStoryError && (
            <StoryCreateErrorMessage className="px-4">
              스토리를 완성하지 못했어요
            </StoryCreateErrorMessage>
          )}
        </div>
      </div>
    </StoryCreateStepLayout>
  );
}
