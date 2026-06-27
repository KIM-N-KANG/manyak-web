'use client';

import { useRef, useState } from 'react';

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
  useGetSimpleStoryTags,
} from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type {
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { saveCreatedChatId } from '@/features/chats/list/utils/chat-id-storage';
import { track } from '@/lib/analytics';

import type { StoryCreateStep } from '../types';
import { saveCreatedStoryId } from '../utils/story-id-storage';
import { getSelectedKeywordsByCategory } from '../utils/tag-categories';

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
  const [createdStoryId, setCreatedStoryId] = useState<string | null>(null);
  const [hasCompletionFailed, setHasCompletionFailed] = useState(false);
  const completedStoryRef = useRef<{
    storyId: string;
    genre?: string[];
  } | null>(null);

  const simpleStoryTags = useGetSimpleStoryTags();

  const failToAdditionalInfo = () => {
    setStep('additional-info');
    setHasCompletionFailed(true);
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
    },
  });
  const createChat = useCreateChat({
    mutation: {
      onSuccess: async (response) => {
        const chatId = response.status === 201 ? response.data.id : undefined;

        if (!chatId) {
          failToAdditionalInfo();

          return;
        }

        saveCreatedChatId(chatId);

        const completedStoryId =
          completedStoryRef.current?.storyId ?? createdStoryId;

        if (completedStoryId !== null) {
          track('client_storyCreate_completed', {
            story_id: completedStoryId,
            chat_id: chatId,
            genre: completedStoryRef.current?.genre,
          });
        }

        await queryClient.prefetchQuery(getGetChatDetailQueryOptions(chatId));
        toast.success(TOAST_MESSAGE.STORY_COMPLETED);
        router.replace(APP_PATH.CHAT_ROOM(chatId));
      },
      onError: () => {
        failToAdditionalInfo();
      },
    },
  });

  const createStory = useCreateSimpleStory({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 201) {
          failToAdditionalInfo();

          return;
        }

        const storyId = response.data.id;

        if (typeof storyId === 'string') {
          saveCreatedStoryId(storyId);
          setCreatedStoryId(storyId);
          completedStoryRef.current = { storyId, genre: response.data.genres };
        }

        createChat.mutate({ data: { storyId: response.data.id } });
      },
      onError: () => {
        failToAdditionalInfo();
      },
    },
  });

  const storylines = getGeneratedStorylines(generationResult);
  const selectedKeywordGroups = getSelectedKeywordsByCategory(
    generationRequest,
    simpleStoryTags.data?.data ?? [],
  );
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
    track('client_storyCreate_storyGeneration_requested');
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

    if (typeof simpleCreationId === 'number') {
      track('client_storyCreate_storylineOption_selected', {
        creation_id: String(simpleCreationId),
        position: activeStorylineIndex,
      });
    }

    setSelectedStoryline(activeStoryline);
    setHasCompletionFailed(false);
    setStep('additional-info');
  };

  const handleBackToStorylineSelect = () => {
    setSelectedStoryline(null);
    setStep('storyline-select');
  };

  const handleCompleteStory = (additionalInfos: string[]) => {
    setHasCompletionFailed(false);

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
    creationId:
      typeof simpleCreationId === 'number'
        ? String(simpleCreationId)
        : undefined,
    shouldConfirmBack,
    storylines,
    selectedKeywordGroups,
    activeStorylineIndex,
    selectedStoryline,
    canCompleteStory,
    isGeneratingStorylines: generateStorylines.isPending,
    hasGenerateStorylinesError: generateStorylines.isError,
    isCompletingStory: createStory.isPending || createChat.isPending,
    hasCompleteStoryError: hasCompletionFailed,
    handleGenerateStoryline,
    handleRegenerateStorylines,
    handleActiveStorylineIndexChange: setActiveStorylineIndex,
    handleSelectStoryline,
    handleBackToStorylineSelect,
    handleCompleteStory,
  };
}
