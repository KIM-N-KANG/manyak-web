'use client';

import { useEffect } from 'react';

import { track } from '@/observability/analytics';

import { useStoryCreateFunnel } from '../hooks/use-story-create-funnel';
import { mapStepToSpec } from '../utils/step-analytics';
import { StoryCreateHeader } from './header/story-create-header';
import { StoryAdditionalInfoStepSection } from './step-sections/story-additional-info-step-section';
import { StoryCompletionLoading } from './step-sections/story-completion-loading';
import { StoryTagStepSection } from './step-sections/story-tag-step-section';
import { StorylineSelectStepSection } from './step-sections/storyline-select-step-section';

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
    handleGenerateStorylines,
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
        <StoryTagStepSection
          isGeneratingStorylines={isGeneratingStorylines}
          hasGenerateStorylinesError={hasGenerateStorylinesError}
          onGenerateStorylines={handleGenerateStorylines}
        />
      )}

      {step === 'storyline-select' && (
        <StorylineSelectStepSection
          storylines={storylines}
          creationId={creationId}
          selectedTagGroups={selectedTagGroups}
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
          storylineItem={selectedStoryline}
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

      {step === 'complete' && <StoryCompletionLoading />}
    </div>
  );
}
