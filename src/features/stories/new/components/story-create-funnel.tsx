'use client';

import { useStoryCreateFunnel } from '../hooks/use-story-create-funnel';
import { StoryAdditionalInfoStepSection } from './story-additional-info-step-section';
import { StoryCompletionSection } from './story-completion-section';
import { StoryCreateHeader } from './story-create-header';
import { StoryKeywordStepSection } from './story-keyword-step-section';
import { StorylineSelectStepSection } from './storyline-select-step-section';

export function StoryCreateFunnel() {
  const {
    step,
    shouldConfirmBack,
    storylines,
    activeStorylineIndex,
    selectedStoryline,
    canCompleteStory,
    isGeneratingStoryline,
    hasGenerateStorylineError,
    isRegeneratingStorylines,
    hasRegenerateStorylinesError,
    completedStory,
    isCompletingStory,
    hasCompleteStoryError,
    handleGenerateStoryline,
    handleRegenerateStorylines,
    handleActiveStorylineIndexChange,
    handleSelectStoryline,
    handleBackToStorylineSelect,
    handleCompleteStory,
  } = useStoryCreateFunnel();

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <StoryCreateHeader requiresBackConfirmation={shouldConfirmBack} />

      {step === 'keyword' && (
        <StoryKeywordStepSection
          isGeneratingStoryline={isGeneratingStoryline}
          hasGenerateStorylineError={hasGenerateStorylineError}
          onGenerateStoryline={handleGenerateStoryline}
        />
      )}

      {step === 'storyline-select' && (
        <StorylineSelectStepSection
          storylines={storylines}
          activeStorylineIndex={activeStorylineIndex}
          isRegeneratingStorylines={isRegeneratingStorylines}
          hasRegenerateStorylinesError={hasRegenerateStorylinesError}
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
          onCompleteStory={handleCompleteStory}
          onBackToStorylineSelect={handleBackToStorylineSelect}
        />
      )}

      {step === 'complete' && (
        <StoryCompletionSection
          isCompletingStory={isCompletingStory}
          completedStory={completedStory}
        />
      )}
    </div>
  );
}
