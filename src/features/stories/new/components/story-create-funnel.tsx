'use client';

import { useEffect } from 'react';

import { CreditShortageDialog } from '@/components/common/credit-shortage-dialog';
import { LoginRequiredDialog } from '@/features/auth/_shared/components/login-required-dialog';
import { track } from '@/observability/analytics';

import { useStoryCreateFunnel } from '../hooks/use-story-create-funnel';
import { mapStepToSpec } from '../utils/step-analytics';
import { StoryAdditionalInfoStepSection } from './additional-info-step/story-additional-info-step-section';
import { StoryCompletionLoading } from './complete-step/story-completion-loading';
import { StoryCreateHeader } from './header/story-create-header';
import { StorylineSelectStepSection } from './storyline-step/storyline-select-step-section';
import { StoryTagStepSection } from './tag-step/story-tag-step-section';

export function StoryCreateFunnel() {
  const {
    step,
    creationId,
    storylines,
    selectedTagGroups,
    activeStorylineIndex,
    selectedStoryline,
    selectedRecommendations,
    additionalInfos,
    canAddAdditionalInfo,
    canCompleteStory,
    isGeneratingStorylines,
    hasGenerateStorylinesError,
    isCompletingStory,
    hasCompleteStoryError,
    guestLimitTrigger,
    isGuestLimitReached,
    closeGuestLimitDialog,
    creditShortageTrigger,
    closeCreditShortageDialog,
    handleGenerateStorylines,
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
    backDialogOpen,
    onBackDialogOpenChange,
    handleHeaderBack,
    handleConfirmBack,
  } = useStoryCreateFunnel();

  useEffect(() => {
    track('client_storyCreate_viewed');
  }, []);

  useEffect(() => {
    track('client_storyCreate_step_viewed', mapStepToSpec(step));
  }, [step]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <StoryCreateHeader
        step={step}
        backDialogOpen={backDialogOpen}
        onBackClick={handleHeaderBack}
        onBackDialogOpenChange={onBackDialogOpenChange}
        onConfirmBack={handleConfirmBack}
      />

      {step === 'keyword' && (
        <StoryTagStepSection
          isGeneratingStorylines={isGeneratingStorylines}
          hasGenerateStorylinesError={hasGenerateStorylinesError}
          isGuestLimitReached={isGuestLimitReached}
          onGenerateStorylines={handleGenerateStorylines}
        />
      )}

      {step === 'storyline-select' && (
        <StorylineSelectStepSection
          storylines={storylines}
          creationId={creationId}
          selectedTagGroups={selectedTagGroups}
          activeStorylineIndex={activeStorylineIndex}
          isGeneratingStorylines={isGeneratingStorylines}
          hasGenerateStorylinesError={hasGenerateStorylinesError}
          isGuestLimitReached={isGuestLimitReached}
          onActiveStorylineIndexChange={handleActiveStorylineIndexChange}
          onRegenerateStorylines={handleRegenerateStorylines}
          onSelectStoryline={handleSelectStoryline}
        />
      )}

      {step === 'additional-info' && selectedStoryline && (
        <StoryAdditionalInfoStepSection
          storylineItem={selectedStoryline}
          isCompletingStory={isCompletingStory}
          hasCompleteStoryError={hasCompleteStoryError}
          isGuestLimitReached={isGuestLimitReached}
          canCompleteStory={canCompleteStory}
          selectedRecommendations={selectedRecommendations}
          additionalInfos={additionalInfos}
          canAddAdditionalInfo={canAddAdditionalInfo}
          onToggleRecommendation={handleToggleRecommendation}
          onAddAdditionalInfo={addAdditionalInfo}
          onRemoveAdditionalInfo={removeAdditionalInfo}
          onChangeAdditionalInfo={changeAdditionalInfo}
          onRegisterAdditionalInfoInput={registerAdditionalInfoInput}
          onCompleteStory={handleCompleteStory}
          onBackToStorylineSelect={handleBackToStorylineSelect}
        />
      )}

      {step === 'complete' && <StoryCompletionLoading />}

      <LoginRequiredDialog
        trigger={guestLimitTrigger}
        onOpenChange={(open) => {
          if (!open) {
            closeGuestLimitDialog();
          }
        }}
      />
      <CreditShortageDialog
        trigger={creditShortageTrigger}
        onOpenChange={(open) => {
          if (!open) {
            closeCreditShortageDialog();
          }
        }}
      />
    </div>
  );
}
