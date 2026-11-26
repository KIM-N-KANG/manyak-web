'use client';

import type {
  CreateSimpleStoryRequestVisibility,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import { StoryVisibilityField } from '@/features/stories/_shared/components/story-visibility-field';

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
  /** 고른 스토리라인. 본문과 추천 정보를 여기서 읽는다. */
  storylineItem: SimpleStorylineResponse;
  /** 완성 기록을 저장하거나 요청하는 중인지. 참이면 모든 입력과 버튼을 막는다. */
  isCompletingStory: boolean;
  /** 완성 요청이 실패해 이 단계로 돌아왔는지. 본문 끝에 실패 안내를 보인다. */
  hasCompleteStoryError: boolean;
  /** 완성에 필요한 서버 제작 ID와 스토리라인 ID가 있는지. 화풍 선택 여부와는 무관하다. */
  canCompleteStory: boolean;
  /** 고른 추천 정보의 문구 */
  selectedRecommendations: Set<string>;
  additionalInfos: AdditionalInfoInput[];
  canAddAdditionalInfo: boolean;
  /** 고른 화풍 코드. 처음에는 null이고 완성을 누를 때 검증한다. */
  artStyle: string | null;
  /** 화풍 없이 완성을 눌렀는지. 하단 버튼 위에 화풍 필수 안내를 보인다. */
  hasArtStyleError: boolean;
  visibility: CreateSimpleStoryRequestVisibility;
  /** `pressed`가 참이면 추천 정보를 고르고, 거짓이면 해제한다. */
  onToggleRecommendation: (recommendation: string, pressed: boolean) => void;
  onAddAdditionalInfo: () => void;
  onRemoveAdditionalInfo: (id: string) => void;
  onChangeAdditionalInfo: (
    id: string,
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  /** 추가 정보 칸의 입력 요소를 등록한다. 새 칸으로 스크롤하는 데 쓴다. */
  onRegisterAdditionalInfoInput: (
    id: string,
    element: HTMLTextAreaElement | null,
  ) => void;
  onArtStyleChange: (code: string) => void;
  onVisibilityChange: (value: CreateSimpleStoryRequestVisibility) => void;
  onCompleteStory: () => void;
  /** 스토리라인을 다시 고르러 간다. 입력한 추가 정보가 있으면 퍼널이 버릴지 먼저 묻는다. */
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
  visibility,
  onToggleRecommendation,
  onAddAdditionalInfo,
  onRemoveAdditionalInfo,
  onChangeAdditionalInfo,
  onRegisterAdditionalInfoInput,
  onArtStyleChange,
  onVisibilityChange,
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

          <div className="px-4">
            <StoryVisibilityField
              value={visibility}
              disabled={isCompletingStory}
              onValueChange={onVisibilityChange}
            />
          </div>

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
