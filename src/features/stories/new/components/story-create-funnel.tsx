'use client';

import { useState } from 'react';

import { useStoryCreateFunnel } from '../hooks/use-story-create-funnel';
import { StoryAdditionalInfoStepSection } from './story-additional-info-step-section';
import { StoryCompletionSection } from './story-completion-section';
import { StoryCreateHeader } from './story-create-header';
import { StoryKeywordStepSection } from './story-keyword-step-section';
import { StorylineSelectStepSection } from './storyline-select-step-section';

export function StoryCreateFunnel() {
  const [scrolledStep, setScrolledStep] = useState<string | null>(null);

  const {
    step,
    shouldConfirmBack,
    storylines,
    activeStorylineIndex,
    selectedStoryline,
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
    handleCompleteStory,
  } = useStoryCreateFunnel();

  const hasScrolled = scrolledStep === step;

  const handleContentScroll = (event: React.UIEvent<HTMLElement>) => {
    setScrolledStep(event.currentTarget.scrollTop > 0 ? step : null);
  };

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden">
      <StoryCreateHeader
        step={step}
        requiresBackConfirmation={shouldConfirmBack}
        hasScrolled={hasScrolled}
      />

      {step === 'keyword' && (
        <StoryKeywordStepSection
          isGeneratingStoryline={isGeneratingStorylines}
          hasGenerateStorylineError={hasGenerateStorylinesError}
          onGenerateStoryline={handleGenerateStoryline}
          onScroll={handleContentScroll}
        />
      )}

      {step === 'storyline-select' && (
        <StorylineSelectStepSection
          storylines={storylines}
          activeStorylineIndex={activeStorylineIndex}
          isRegeneratingStorylines={isGeneratingStorylines}
          hasRegenerateStorylinesError={hasGenerateStorylinesError}
          onActiveStorylineIndexChange={handleActiveStorylineIndexChange}
          onRegenerateStorylines={handleRegenerateStorylines}
          onSelectStoryline={handleSelectStoryline}
          onScroll={handleContentScroll}
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
          onScroll={handleContentScroll}
        />
      )}

      {step === 'complete' && (
        <StoryCompletionSection onScroll={handleContentScroll} />
      )}
    </div>
  );
}
