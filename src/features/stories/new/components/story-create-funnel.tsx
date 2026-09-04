'use client';

import { useEffect } from 'react';

import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { StoryCreateResumeDialog } from '@/features/stories/_shared/components/story-create-resume-dialog';
import { track } from '@/observability/analytics';

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
    step,
    tagStep,
    draftSaveStatus,
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
    resumeDialogOpen,
    handleResumeContinue,
    handleResumeDiscard,
    closeResumeDialog,
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
        draftSaveStatus={draftSaveStatus}
        backDialog={backDialog}
        onBackClick={handleHeaderBack}
        onBackDialogOpenChange={onBackDialogOpenChange}
        onConfirmBack={handleConfirmBack}
      />

      {step === 'keyword' && (
        <StoryTagStepSection
          controller={tagStep}
          hasGenerateStorylinesError={hasGenerateStorylinesError}
          isGuestLimitReached={isGuestLimitReached}
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

      <StorylineReselectDialog
        open={reselectDialogOpen}
        onOpenChange={onReselectDialogOpenChange}
        onConfirm={handleConfirmReselect}
      />

      <StoryCreateResumeDialog
        open={resumeDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeResumeDialog();
          }
        }}
        onContinue={handleResumeContinue}
        onDiscard={handleResumeDiscard}
      />
      <LoginRequiredSheet
        trigger={guestLimitTrigger}
        onOpenChange={(open) => {
          if (!open) {
            closeGuestLimitDialog();
          }
        }}
      />
    </div>
  );
}
