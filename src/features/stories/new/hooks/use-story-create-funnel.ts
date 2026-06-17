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

import type { StoryCreateStep } from '../types';
import { saveCreatedStoryId } from '../utils/story-id-storage';

const getGeneratedStorylines = (
  generationResult: GenerateSimpleStorylinesResponse | null,
) =>
  (generationResult?.storylines ?? []).filter(
    (storyline): storyline is SimpleStorylineResponse => Boolean(storyline),
  );

export function useStoryCreateFunnel() {
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
    setGenerationRequest(request);
    setGenerationResult(null);
    setActiveStorylineIndex(0);
    setSelectedStoryline(null);
    setStep('storyline-select');
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

  return {
    step,
    shouldConfirmBack,
    storylines,
    activeStorylineIndex,
    selectedStoryline,
    canCompleteStory,
    isGeneratingStoryline: generateStorylines.isPending,
    hasGenerateStorylineError: generateStorylines.isError,
    isRegeneratingStorylines: generateStorylines.isPending,
    hasRegenerateStorylinesError: generateStorylines.isError,
    isCompletingStory: createStory.isPending,
    hasCompleteStoryError: createStory.isError,
    handleGenerateStoryline,
    handleRegenerateStorylines,
    handleActiveStorylineIndexChange: setActiveStorylineIndex,
    handleSelectStoryline,
    handleBackToStorylineSelect,
    handleCompleteStory,
  };
}
