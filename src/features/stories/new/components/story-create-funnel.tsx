'use client';

import { useEffect } from 'react';

import { CollapsedListItemsProvider } from '@/components/common/collapsible-list-item';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { CreditShortageSheet } from '@/features/my/_shared/components/credit-shortage-sheet';
import { CreateTutorialDialog } from '@/features/stories/_shared/components/create-tutorial-dialog';
import { DraftConflictDialog } from '@/features/stories/_shared/components/draft-conflict-dialog';
import { useCreateTutorial } from '@/features/stories/_shared/hooks/use-create-tutorial';
import type { CreateTutorialScreen } from '@/features/stories/_shared/utils/create-tutorial-storage';
import { track } from '@/observability/analytics';

import { STORY_CREATE_GATE_COPY } from '../constants';
import { useStoryCreateFunnel } from '../hooks/use-story-create-funnel';
import { mapStepToSpec } from '../utils/step-analytics';
import { StoryAdditionalInfoStepSection } from './additional-info-step/story-additional-info-step-section';
import { StorylineReselectDialog } from './additional-info-step/storyline-reselect-dialog';
import { StoryCompletionLoading } from './complete-step/story-completion-loading';
import { StoryCreateHeader } from './header/story-create-header';
import { StorylineSelectStepSection } from './storyline-step/storyline-select-step-section';
import { StoryTagStepSection } from './tag-step/story-tag-step-section';

export function StoryCreateFunnel() {
  const {
    isEntryResolved,
    entryError,
    retryEntry,
    guestLimitOpen,
    setGuestLimitOpen,
    creditShortage,
    step,
    tagStep,
    isSavingDraft,
    canSaveDraft,
    isDraftSaved,
    saveDraft,
    draftConflict,
    creationId,
    storylines,
    selectedTagGroups,
    activeStorylineIndex,
    selectedStoryline,
    selectedRecommendations,
    additionalInfos,
    canAddAdditionalInfo,
    artStyle,
    hasArtStyleError,
    selectArtStyle,
    canCompleteStory,
    isGeneratingStorylines,
    hasGenerateStorylinesError,
    isContentRejected,
    isCompletingStory,
    hasCompleteStoryError,
    handleRegenerateStorylines,
    handleActiveStorylineIndexChange,
    handleSelectStoryline,
    handleBackToStorylineSelect,
    handleToggleRecommendation,
    addAdditionalInfo,
    removeAdditionalInfo,
    changeAdditionalInfo,
    registerAdditionalInfoInput,
    handleCompleteStory,
    backDialog,
    onBackDialogOpenChange,
    reselectDialogOpen,
    onReselectDialogOpenChange,
    handleConfirmReselect,
    handleHeaderBack,
    handleConfirmBack,
  } = useStoryCreateFunnel();

  const tutorial = useCreateTutorial(
    getTutorialScreen({
      isReady:
        isEntryResolved &&
        !entryError &&
        !guestLimitOpen &&
        !creditShortage.open &&
        !draftConflict.open &&
        !isCompletingStory,
      step,
      hasStorylines:
        !isGeneratingStorylines &&
        !hasGenerateStorylinesError &&
        storylines.length > 0,
      hasSelectedStoryline: selectedStoryline !== null,
    }),
  );

  useEffect(() => {
    track('client_storyCreate_viewed');
  }, []);

  useEffect(() => {
    track('client_storyCreate_step_viewed', mapStepToSpec(step));
  }, [step]);

  // 진입 판정 중에는 채팅방에 들어갈 때처럼 헤더 없이 가운데 스피너만 둔다. 앞선 로그인 확인 스피너와 이어진다.
  if (!isEntryResolved && !entryError) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <PageLoadingSpinner aria-label={STORY_CREATE_GATE_COPY.loading} />
      </div>
    );
  }

  return (
    <CollapsedListItemsProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <LoginRequiredSheet
          open={guestLimitOpen}
          onOpenChange={setGuestLimitOpen}
        />
        <CreditShortageSheet
          open={creditShortage.open}
          onOpenChange={creditShortage.onOpenChange}
          trigger="story_create"
          onCharge={creditShortage.onCharge}
        />
        <StoryCreateHeader
          step={step}
          isSavingDraft={isSavingDraft}
          canSaveDraft={canSaveDraft}
          isDraftSaved={isDraftSaved}
          onSaveDraft={saveDraft}
          backDialog={backDialog}
          onBackClick={handleHeaderBack}
          onBackDialogOpenChange={onBackDialogOpenChange}
          onConfirmBack={handleConfirmBack}
        />

        {entryError && (
          <RetryListStatus
            title={TOAST_MESSAGE.STORY_DRAFT_LOAD_FAILED}
            onRetry={retryEntry}
          />
        )}

        {isEntryResolved && !entryError && step === 'keyword' && (
          <StoryTagStepSection
            controller={tagStep}
            hasGenerateStorylinesError={hasGenerateStorylinesError}
            isContentRejected={isContentRejected}
          />
        )}

        {isEntryResolved && !entryError && step === 'storyline-select' && (
          <StorylineSelectStepSection
            storylines={storylines}
            creationId={creationId}
            selectedTagGroups={selectedTagGroups}
            activeStorylineIndex={activeStorylineIndex}
            isGeneratingStorylines={isGeneratingStorylines}
            hasGenerateStorylinesError={hasGenerateStorylinesError}
            onActiveStorylineIndexChange={handleActiveStorylineIndexChange}
            onRegenerateStorylines={handleRegenerateStorylines}
            onSelectStoryline={handleSelectStoryline}
          />
        )}

        {isEntryResolved &&
          !entryError &&
          step === 'additional-info' &&
          selectedStoryline && (
            <StoryAdditionalInfoStepSection
              storylineItem={selectedStoryline}
              isCompletingStory={isCompletingStory}
              hasCompleteStoryError={hasCompleteStoryError}
              canCompleteStory={canCompleteStory}
              selectedRecommendations={selectedRecommendations}
              additionalInfos={additionalInfos}
              canAddAdditionalInfo={canAddAdditionalInfo}
              artStyle={artStyle}
              hasArtStyleError={hasArtStyleError}
              onToggleRecommendation={handleToggleRecommendation}
              onAddAdditionalInfo={addAdditionalInfo}
              onRemoveAdditionalInfo={removeAdditionalInfo}
              onChangeAdditionalInfo={changeAdditionalInfo}
              onRegisterAdditionalInfoInput={registerAdditionalInfoInput}
              onArtStyleChange={selectArtStyle}
              onCompleteStory={handleCompleteStory}
              onBackToStorylineSelect={handleBackToStorylineSelect}
            />
          )}

        {step === 'complete' && <StoryCompletionLoading />}

        <StorylineReselectDialog
          open={reselectDialogOpen}
          onOpenChange={onReselectDialogOpenChange}
          onConfirm={handleConfirmReselect}
        />
        <DraftConflictDialog
          open={draftConflict.open}
          onKeep={draftConflict.onKeep}
          onSave={draftConflict.onSave}
        />
        {tutorial.stage !== null && (
          <CreateTutorialDialog
            stage={tutorial.stage}
            genres={
              selectedTagGroups.find((group) => group.id === 'GENRE')?.tags
            }
            onPrimary={tutorial.handlePrimary}
            onSecondary={tutorial.handleSecondary}
          />
        )}
      </div>
    </CollapsedListItemsProvider>
  );
}

type TutorialScreenContext = {
  /** 진입 판정이 끝나고 안내를 가릴 시트, 다이얼로그, 완성 요청이 없는지 */
  isReady: boolean;
  step: ReturnType<typeof useStoryCreateFunnel>['step'];
  /** 스토리라인 생성이 끝나 고를 스토리라인이 있는지 */
  hasStorylines: boolean;
  hasSelectedStoryline: boolean;
};

/**
 * 퍼널 상태에서 첫 진입 안내를 받을 수 있는 화면 상태를 고른다.
 *
 * @param context 퍼널 상태
 * @returns 안내를 받을 수 있는 화면 상태. 없으면 null
 */
function getTutorialScreen({
  isReady,
  step,
  hasStorylines,
  hasSelectedStoryline,
}: TutorialScreenContext): CreateTutorialScreen | null {
  if (!isReady) return null;

  if (step === 'keyword') return 'keyword';

  if (step === 'storyline-select') return hasStorylines ? 'storyline' : null;

  if (step === 'additional-info')
    return hasSelectedStoryline ? 'additional-info' : null;

  return null;
}
