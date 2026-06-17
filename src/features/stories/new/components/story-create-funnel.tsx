'use client';

import { useState } from 'react';

import {
  useCreateSimpleStory,
  useGenerateSimpleStorylines,
} from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type {
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';

import { saveCreatedStoryId } from '../utils/story-id-storage';
import { StoryAdditionalInfoStepSection } from './story-additional-info-step-section';
import { StoryCompletionSection } from './story-completion-section';
import { StoryCreateHeader } from './story-create-header';
import { StoryKeywordStepSection } from './story-keyword-step-section';
import { StorylineSelectStepSection } from './storyline-select-step-section';

type StoryCreateStep =
  | 'keyword'
  | 'storyline-select'
  | 'additional-info'
  | 'complete';

const getGeneratedStorylines = (
  generationResult: GenerateSimpleStorylinesResponse | null,
) =>
  (generationResult?.storylines ?? []).filter(
    (storyline): storyline is SimpleStorylineResponse => Boolean(storyline),
  );

export function StoryCreateFunnel() {
  const [step, setStep] = useState<StoryCreateStep>('keyword');
  const [generationRequest, setGenerationRequest] =
    useState<GenerateSimpleStorylinesRequest | null>(null);
  const [generationResult, setGenerationResult] =
    useState<GenerateSimpleStorylinesResponse | null>(null);
  const [activeStorylineIndex, setActiveStorylineIndex] = useState(0);
  const [selectedStoryline, setSelectedStoryline] =
    useState<SimpleStorylineResponse | null>(null);

  const generateStorylines = useGenerateSimpleStorylines({
    mutation: {
      onSuccess: (response, variables) => {
        if (response.status !== 201) {
          return;
        }

        setGenerationRequest(variables.data);
        setGenerationResult(response.data);
        setActiveStorylineIndex(0);
        setSelectedStoryline(null);
        setStep('storyline-select');
      },
    },
  });
  const createStory = useCreateSimpleStory({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 201) {
          return;
        }

        const storyId = response.data.storyId;

        if (typeof storyId === 'number') {
          saveCreatedStoryId(storyId);
        }

        setStep('complete');
      },
    },
  });

  const storylines = getGeneratedStorylines(generationResult);
  const activeStoryline =
    storylines[activeStorylineIndex] ?? storylines[0] ?? null;
  const simpleCreationId = generationResult?.simpleCreationId;
  const canCompleteStory =
    typeof simpleCreationId === 'number' &&
    typeof selectedStoryline?.id === 'number';
  const shouldConfirmBack = step !== 'keyword';

  const handleGenerateStoryline = (
    request: GenerateSimpleStorylinesRequest,
  ) => {
    generateStorylines.mutate({ data: request });
  };

  const handleRegenerateStorylines = () => {
    if (!generationRequest) {
      return;
    }

    generateStorylines.mutate({ data: generationRequest });
  };

  const handleSelectStoryline = () => {
    if (!activeStoryline) {
      return;
    }

    setSelectedStoryline(activeStoryline);
    setStep('additional-info');
  };

  const handleBackToStorylineSelect = () => {
    setSelectedStoryline(null);
    setStep('storyline-select');
  };

  const handleCompleteStory = (additionalInfos: string[]) => {
    if (
      typeof simpleCreationId !== 'number' ||
      typeof selectedStoryline?.id !== 'number'
    ) {
      return;
    }

    createStory.mutate({
      data: {
        simpleCreationId: simpleCreationId,
        storylineId: selectedStoryline.id,
        additionalInfos: additionalInfos,
      },
    });
  };

  return (
    <div className="flex min-h-svh flex-col">
      {step !== 'complete' && (
        <StoryCreateHeader requiresBackConfirmation={shouldConfirmBack} />
      )}

      {step === 'keyword' && (
        <StoryKeywordStepSection
          isGeneratingStoryline={generateStorylines.isPending}
          hasGenerateStorylineError={generateStorylines.isError}
          onGenerateStoryline={handleGenerateStoryline}
        />
      )}

      {step === 'storyline-select' && (
        <StorylineSelectStepSection
          storylines={storylines}
          activeStorylineIndex={activeStorylineIndex}
          isRegeneratingStorylines={generateStorylines.isPending}
          hasRegenerateStorylinesError={generateStorylines.isError}
          onActiveStorylineIndexChange={setActiveStorylineIndex}
          onRegenerateStorylines={handleRegenerateStorylines}
          onSelectStoryline={handleSelectStoryline}
        />
      )}

      {step === 'additional-info' && selectedStoryline && (
        <StoryAdditionalInfoStepSection
          storyline={selectedStoryline}
          isCompletingStory={createStory.isPending}
          hasCompleteStoryError={createStory.isError}
          canCompleteStory={canCompleteStory}
          onCompleteStory={handleCompleteStory}
          onBackToStorylineSelect={handleBackToStorylineSelect}
        />
      )}

      {step === 'complete' && <StoryCompletionSection />}
    </div>
  );
}
