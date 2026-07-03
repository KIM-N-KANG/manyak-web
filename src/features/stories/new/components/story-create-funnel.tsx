'use client';

import { useEffect } from 'react';

import { track } from '@/observability/analytics';

import { useStoryCreateFunnel } from '../hooks/use-story-create-funnel';
import { mapStepToSpec } from '../utils/step-analytics';
import { StoryAdditionalInfoStepSection } from './story-additional-info-step-section';
import { StoryCompletionLoadingState } from './story-completion-loading-state';
import { StoryCreateHeader } from './story-create-header';
import { StoryKeywordStepSection } from './story-keyword-step-section';
import { StorylineSelectStepSection } from './storyline-select-step-section';

export function StoryCreateFunnel() {
  const {
    step,
    creationId,
    storylines,
    selectedKeywordGroups,
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
    handleGenerateStoryline,
    handleRegenerateStorylines,
    handleActiveStorylineIndexChange,
    handleSelectStoryline,
    handleBackToStorylineSelect,
    handleToggleRecommendation,
    addAdditionalInfo,
    removeAdditionalInfo,
    changeAdditionalInfo,
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
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <StoryCreateHeader
        step={step}
        backDialogOpen={backDialogOpen}
        onBackClick={handleHeaderBack}
        onBackDialogOpenChange={onBackDialogOpenChange}
        onConfirmBack={handleConfirmBack}
      />

      {step === 'keyword' && (
        <StoryKeywordStepSection
          isGeneratingStoryline={isGeneratingStorylines}
          hasGenerateStorylineError={hasGenerateStorylinesError}
          onGenerateStoryline={handleGenerateStoryline}
        />
      )}

      {step === 'storyline-select' && (
        <StorylineSelectStepSection
          storylines={storylines}
          creationId={creationId}
          selectedKeywordGroups={selectedKeywordGroups}
          activeStorylineIndex={activeStorylineIndex}
          isRegeneratingStorylines={isGeneratingStorylines}
          hasRegenerateStorylinesError={hasGenerateStorylinesError}
          onActiveStorylineIndexChange={handleActiveStorylineIndexChange}
          onRegenerateStorylines={handleRegenerateStorylines}
          onSelectStoryline={handleSelectStoryline}
        />
      )}

      {step === 'additional-info' && selectedStoryline && (
        <StoryAdditionalInfoStepSection
          storyline={selectedStoryline}
          isCompletingStory={isCompletingStory}
          hasCompleteStoryError={hasCompleteStoryError}
          canCompleteStory={canCompleteStory}
          selectedRecommendations={selectedRecommendations}
          additionalInfos={additionalInfos}
          canAddAdditionalInfo={canAddAdditionalInfo}
          onToggleRecommendation={handleToggleRecommendation}
          onAddAdditionalInfo={addAdditionalInfo}
          onRemoveAdditionalInfo={removeAdditionalInfo}
          onChangeAdditionalInfo={changeAdditionalInfo}
          onCompleteStory={handleCompleteStory}
          onBackToStorylineSelect={handleBackToStorylineSelect}
        />
      )}

      {step === 'complete' && <StoryCompletionLoadingState />}
    </div>
  );
}
