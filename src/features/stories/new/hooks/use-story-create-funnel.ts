'use client';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  getGetChatDetailQueryOptions,
  useCreateChat,
} from '@/api/generated/endpoints/chats/chats';
import {
  useCreateSimpleStory,
  useGenerateSimpleStorylines,
} from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type {
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { saveCreatedChatId } from '@/features/chats/list/utils/chat-id-storage';

import type { StoryCreateStep } from '../types';
import { saveCreatedStoryId } from '../utils/story-id-storage';

const getGeneratedStorylines = (
  generationResult: GenerateSimpleStorylinesResponse | null,
) =>
  (generationResult?.storylines ?? []).filter(
    (storyline): storyline is SimpleStorylineResponse => Boolean(storyline),
  );

export function useStoryCreateFunnel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<StoryCreateStep>('keyword');
  const [generationRequest, setGenerationRequest] =
    useState<GenerateSimpleStorylinesRequest | null>(null);
  const [generationResult, setGenerationResult] =
    useState<GenerateSimpleStorylinesResponse | null>(null);
  const [activeStorylineIndex, setActiveStorylineIndex] = useState(0);
  const [selectedStoryline, setSelectedStoryline] =
    useState<SimpleStorylineResponse | null>(null);
  const [createdStoryId, setCreatedStoryId] = useState<number | null>(null);

  const failToAdditionalInfo = (message: string) => {
    setStep('additional-info');
    toast.error(message);
  };

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
      onError: () => {
        toast.error(TOAST_MESSAGE.STORYLINE_CREATE_FAILED);
      },
    },
  });
  const createChat = useCreateChat({
    mutation: {
      onSuccess: async (response) => {
        const chatId = response.status === 201 ? response.data.id : undefined;

        if (!chatId) {
          failToAdditionalInfo(TOAST_MESSAGE.CHAT_START_FAILED);

          return;
        }

        saveCreatedChatId(chatId);
        await queryClient.prefetchQuery(getGetChatDetailQueryOptions(chatId));
        toast.success(TOAST_MESSAGE.STORY_COMPLETED);
        router.replace(APP_PATH.CHAT_ROOM(chatId));
      },
      onError: () => {
        failToAdditionalInfo(TOAST_MESSAGE.CHAT_START_FAILED);
      },
    },
  });

  const createStory = useCreateSimpleStory({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 201) {
          failToAdditionalInfo(TOAST_MESSAGE.STORY_COMPLETE_FAILED);

          return;
        }

        const storyId = response.data.id;

        if (typeof storyId === 'number') {
          saveCreatedStoryId(storyId);
          setCreatedStoryId(storyId);
        }

        createChat.mutate({ data: { storyId: response.data.id } });
      },
      onError: () => {
        failToAdditionalInfo(TOAST_MESSAGE.STORY_COMPLETE_FAILED);
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
    if (createdStoryId !== null) {
      setStep('complete');
      createChat.mutate({ data: { storyId: createdStoryId } });

      return;
    }

    if (
      typeof simpleCreationId !== 'number' ||
      typeof selectedStoryline?.id !== 'number'
    ) {
      return;
    }

    setStep('complete');
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
    isGeneratingStorylines: generateStorylines.isPending,
    hasGenerateStorylinesError: generateStorylines.isError,
    isCompletingStory: createStory.isPending || createChat.isPending,
    hasCompleteStoryError: createStory.isError || createChat.isError,
    handleGenerateStoryline,
    handleRegenerateStorylines,
    handleActiveStorylineIndexChange: setActiveStorylineIndex,
    handleSelectStoryline,
    handleBackToStorylineSelect,
    handleCompleteStory,
  };
}
