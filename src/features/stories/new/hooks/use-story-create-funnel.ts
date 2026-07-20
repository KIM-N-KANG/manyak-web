'use client';

import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import {
  getGetMyChatsQueryKey,
  getGetMyStoriesQueryKey,
} from '@/api/generated/endpoints/users/users';
import type {
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { resolvePaymentRequiredReason } from '@/features/auth/_shared/utils/guest-limit-error';
import {
  type GuestUsageAction,
  incrementGuestUsage,
  isGuestOverLimit,
  isGuestUsageLimitReached,
} from '@/features/auth/_shared/utils/guest-usage-storage';
import { saveCreatedChatId } from '@/features/chats/_shared/utils/chat-id-storage';
import { saveCreatedStoryId } from '@/features/stories/_shared/utils/story-id-storage';
import type {
  CreditShortageTrigger,
  GuestLimitTrigger,
} from '@/observability/analytics';
import { track } from '@/observability/analytics';
import { trackMetaPixelOnce } from '@/observability/marketing/pixel';

import type { StoryCreateStep } from '../types';
import { mapStepToSpec } from '../utils/step-analytics';
import { getSelectedTagsByCategory } from '../utils/tag-categories';
import { useAdditionalInfos } from './use-additional-infos';
import { usePreventPageLeave } from './use-prevent-page-leave';

/**
 * 생성 응답에서 유효한 스토리라인만 걸러 배열로 반환한다.
 *
 * @param generationResult 스토리라인 생성 응답(없을 수 있음)
 * @returns null이 아닌 스토리라인 목록
 */
const getGeneratedStorylines = (
  generationResult: GenerateSimpleStorylinesResponse | null,
) =>
  (generationResult?.storylines ?? []).filter(
    (storyline): storyline is SimpleStorylineResponse => Boolean(storyline),
  );

/**
 * 스토리 생성 퍼널(키워드 → 스토리라인 선택 → 추가 정보 → 완료)의 전체 상태를 관리하는 훅.
 * 스토리라인 생성/재생성, 스토리·채팅 생성, 실패 시 복귀, 이탈 확인 다이얼로그까지 담당한다.
 *
 * @returns 현재 스텝과 퍼널 상태·데이터 및 단계 전환·생성 핸들러들
 */
export function useStoryCreateFunnel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status: sessionStatus } = useSession();
  const [step, setStep] = useState<StoryCreateStep>('keyword');
  const [generationRequest, setGenerationRequest] =
    useState<GenerateSimpleStorylinesRequest | null>(null);
  const [generationResult, setGenerationResult] =
    useState<GenerateSimpleStorylinesResponse | null>(null);
  const [activeStorylineIndex, setActiveStorylineIndex] = useState(0);
  const [selectedStoryline, setSelectedStoryline] =
    useState<SimpleStorylineResponse | null>(null);
  const [createdStoryId, setCreatedStoryId] = useState<string | null>(null);
  const [hasCompleteStoryError, setHasCompleteStoryError] = useState(false);
  const [guestLimitTrigger, setGuestLimitTrigger] =
    useState<GuestLimitTrigger | null>(null);
  const [creditShortageTrigger, setCreditShortageTrigger] =
    useState<CreditShortageTrigger | null>(null);
  const [isGuestLimitReached, setIsGuestLimitReached] = useState(false);
  const [isBackDialogOpen, setIsBackDialogOpen] = useState(false);
  const [selectedRecommendations, setSelectedRecommendations] = useState<
    Set<string>
  >(() => new Set());
  const completedStoryRef = useRef<{
    storyId: string;
    genres?: string[];
  } | null>(null);
  const {
    additionalInfos,
    canAddAdditionalInfo,
    addAdditionalInfo,
    removeAdditionalInfo,
    changeAdditionalInfo,
    registerAdditionalInfoInput,
    getSubmittedAdditionalInfos,
    resetAdditionalInfos,
  } = useAdditionalInfos();

  const simpleStoryTags = useGetSimpleStoryTags();

  const shouldConfirmBack = step !== 'keyword';

  const { confirmLeave, leaveAfterCleanup } = usePreventPageLeave({
    enabled: shouldConfirmBack,
    onBackAttempt: () => setIsBackDialogOpen(true),
  });

  // 진입 버튼(FAB)을 우회한 접근(딥링크·뒤로가기) 백스톱: 이미 스토리를 만든
  // 게스트가 생성 페이지에 도달하면 곧바로 로그인을 유도한다. localStorage는 마운트
  // 시 한 번만 읽고(lazy 초기화), 차단 여부는 렌더 중 파생값으로 계산해 effect
  // 내 setState를 피한다. 세션이 확정된 미로그인 상태에서만 판정해 로딩 중 회원을
  // 오차단하지 않으며, 다이얼로그를 닫으면 재노출하지 않는다.
  const [storyCreateAtLimitOnMount] = useState(() =>
    isGuestUsageLimitReached('storyCreate'),
  );
  const [isBackstopDismissed, setIsBackstopDismissed] = useState(false);
  const isStoryCreateBackstopActive =
    sessionStatus === 'unauthenticated' &&
    storyCreateAtLimitOnMount &&
    !isBackstopDismissed;

  const failToAdditionalInfo = (stage: 'story' | 'chat') => {
    track('client_storyCreate_completeError_shown', { stage });
    setStep('additional-info');
    setHasCompleteStoryError(true);
  };

  // 402 처리: 게스트 체험 한도면 로그인 유도, 회원 크레딧 부족이면 크레딧 획득 유도 다이얼로그를 연다.
  // 사유는 응답 바디 code로 구분하고(백엔드 KNK-524), code가 없으면 세션 상태로 폴백한다.
  // 퍼널의 기존 에러 복귀(failToAdditionalInfo)는 호출부에서 그대로 수행되고, 이 핸들러는 다이얼로그만 얹는다.
  const handlePaymentRequiredError = (
    error: unknown,
    trigger: GuestLimitTrigger,
  ) => {
    const reason = resolvePaymentRequiredReason(error, sessionStatus);

    if (reason === 'guest-trial-limit') {
      setIsGuestLimitReached(true);
      setGuestLimitTrigger(trigger);

      return;
    }

    if (reason === 'insufficient-credit') {
      setCreditShortageTrigger(trigger);
    }
  };

  // 확정된 게스트가 해당 액션 한도에 도달했으면 로그인 유도 다이얼로그를 열고 true를 반환한다.
  // 각 진입점(생성·재생성·완료)의 사전 차단을 한 곳으로 모은다.
  const guardGuestLimit = (
    action: GuestUsageAction,
    trigger: GuestLimitTrigger,
  ): boolean => {
    if (!isGuestOverLimit(sessionStatus, action)) {
      return false;
    }

    setIsGuestLimitReached(true);
    setGuestLimitTrigger(trigger);

    return true;
  };

  const resetAdditionalInfoStep = () => {
    resetAdditionalInfos();
    setSelectedRecommendations(new Set());
  };

  const generateStorylines = useGenerateSimpleStorylines({
    mutation: {
      onSuccess: (response, variables) => {
        if (response.status !== 201) {
          return;
        }

        if (sessionStatus !== 'authenticated') {
          incrementGuestUsage('storylineCreate');
        }

        // 스토리라인 생성 성공 = Meta 광고 퍼널 중간 신호(브라우저당 최초 1회, 재생성 제외).
        trackMetaPixelOnce('StorylinesGenerated');

        setGenerationRequest(variables.data);
        setGenerationResult(response.data);
        setActiveStorylineIndex(0);
        setSelectedStoryline(null);
        setStep('storyline-select');
      },
      onError: (error) => {
        handlePaymentRequiredError(error, 'storyline_generate');
      },
    },
  });
  const createChat = useCreateChat({
    mutation: {
      onSuccess: async (response) => {
        const chatId = response.status === 201 ? response.data.id : undefined;

        if (!chatId) {
          failToAdditionalInfo('chat');

          return;
        }

        // 회원 서재는 서버가 정본 — 로그인 상태에서는 로컬에 ID를 남기지 않는다.
        if (sessionStatus === 'authenticated') {
          void queryClient.invalidateQueries({
            queryKey: getGetMyChatsQueryKey(),
          });
        } else {
          saveCreatedChatId(chatId);
        }

        const completedStoryId =
          completedStoryRef.current?.storyId ?? createdStoryId;

        if (completedStoryId !== null) {
          track('client_storyCreate_completed', {
            story_id: completedStoryId,
            chat_id: chatId,
            genres: completedStoryRef.current?.genres,
          });
        }

        await queryClient.prefetchQuery(getGetChatDetailQueryOptions(chatId));
        toast.success(TOAST_MESSAGE.STORY_COMPLETED);
        leaveAfterCleanup(() => router.replace(APP_PATH.CHAT_ROOM(chatId)));
      },
      onError: (error) => {
        handlePaymentRequiredError(error, 'chat_start');
        failToAdditionalInfo('chat');
      },
    },
  });

  const createStory = useCreateSimpleStory({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 201) {
          failToAdditionalInfo('story');

          return;
        }

        const storyId = response.data.id;

        if (typeof storyId === 'string') {
          if (sessionStatus === 'authenticated') {
            void queryClient.invalidateQueries({
              queryKey: getGetMyStoriesQueryKey(),
            });
          } else {
            saveCreatedStoryId(storyId);
            incrementGuestUsage('storyCreate');
          }

          setCreatedStoryId(storyId);
          completedStoryRef.current = { storyId, genres: response.data.genres };

          // 최종 스토리 컴파일 성공 = Meta 광고 퍼널 중간 신호(브라우저당 최초 1회).
          trackMetaPixelOnce('StoryCompiled');
        }

        createChat.mutate({ data: { storyId: response.data.id } });
      },
      onError: (error) => {
        handlePaymentRequiredError(error, 'story_create');
        failToAdditionalInfo('story');
      },
    },
  });

  const storylines = getGeneratedStorylines(generationResult);
  const selectedTagGroups = getSelectedTagsByCategory(
    generationRequest,
    simpleStoryTags.data?.data ?? [],
  );
  const activeStoryline =
    storylines[activeStorylineIndex] ?? storylines[0] ?? null;
  const simpleCreationId = generationResult?.simpleCreationId;
  const canCompleteStory =
    typeof simpleCreationId === 'number' &&
    typeof selectedStoryline?.id === 'number';

  const handleGenerateStorylines = (
    request: GenerateSimpleStorylinesRequest,
  ) => {
    if (guardGuestLimit('storylineCreate', 'storyline_generate')) {
      return;
    }

    setGenerationRequest(request);
    setGenerationResult(null);
    setActiveStorylineIndex(0);
    setSelectedStoryline(null);
    setIsGuestLimitReached(false);
    resetAdditionalInfoStep();
    setStep('storyline-select');
    track('client_storyCreate_storyGeneration_requested');
    generateStorylines.mutate({ data: request });
  };

  const handleRegenerateStorylines = () => {
    if (!generationRequest) {
      return;
    }

    if (guardGuestLimit('storylineCreate', 'storyline_generate')) {
      return;
    }

    if (typeof simpleCreationId === 'number') {
      track('client_storyCreate_regenerateButton_clicked', {
        creation_id: String(simpleCreationId),
      });
    }

    setIsGuestLimitReached(false);
    generateStorylines.mutate({ data: generationRequest });
  };

  const handleActiveStorylineIndexChange = (index: number) => {
    if (typeof simpleCreationId === 'number') {
      track('client_storyCreate_storylineTab_selected', {
        creation_id: String(simpleCreationId),
        position: index,
      });
    }

    setActiveStorylineIndex(index);
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
    setHasCompleteStoryError(false);
    resetAdditionalInfoStep();
    setStep('additional-info');
  };

  const handleBackToStorylineSelect = () => {
    track('client_storyCreate_backToStorylineButton_clicked');
    setSelectedStoryline(null);
    resetAdditionalInfoStep();
    setStep('storyline-select');
  };

  const handleToggleRecommendation = (
    recommendation: string,
    pressed: boolean,
  ) => {
    track('client_storyCreate_recommendedInfo_clicked', { selected: pressed });
    setSelectedRecommendations((previous) => {
      const next = new Set(previous);

      if (pressed) {
        next.add(recommendation);
      } else {
        next.delete(recommendation);
      }

      return next;
    });
  };

  const handleCompleteStory = () => {
    setHasCompleteStoryError(false);
    setIsGuestLimitReached(false);

    if (createdStoryId !== null) {
      if (guardGuestLimit('chat', 'chat_start')) {
        return;
      }

      if (typeof simpleCreationId === 'number') {
        track('client_storyCreate_storyCompletion_requested', {
          creation_id: String(simpleCreationId),
        });
      }

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

    if (guardGuestLimit('storyCreate', 'story_create')) {
      return;
    }

    track('client_storyCreate_storyCompletion_requested', {
      creation_id: String(simpleCreationId),
    });
    setStep('complete');
    createStory.mutate({
      data: {
        simpleCreationId: simpleCreationId,
        storylineId: selectedStoryline.id,
        additionalInfos: [
          ...selectedRecommendations,
          ...getSubmittedAdditionalInfos(),
        ],
      },
    });
  };

  const handleHeaderBack = () => {
    if (shouldConfirmBack) {
      setIsBackDialogOpen(true);

      return;
    }

    router.back();
  };

  const handleConfirmBack = () => {
    track('client_storyCreate_exitButton_clicked', mapStepToSpec(step));
    setIsBackDialogOpen(false);
    confirmLeave();
  };

  return {
    step,
    creationId:
      typeof simpleCreationId === 'number'
        ? String(simpleCreationId)
        : undefined,
    storylines,
    selectedTagGroups,
    activeStorylineIndex,
    selectedStoryline,
    selectedRecommendations,
    additionalInfos,
    canAddAdditionalInfo,
    canCompleteStory,
    isGeneratingStorylines: generateStorylines.isPending,
    hasGenerateStorylinesError: generateStorylines.isError,
    isCompletingStory: createStory.isPending || createChat.isPending,
    hasCompleteStoryError,
    guestLimitTrigger:
      guestLimitTrigger ??
      (isStoryCreateBackstopActive ? 'story_create' : null),
    isGuestLimitReached: isGuestLimitReached || isStoryCreateBackstopActive,
    closeGuestLimitDialog: () => {
      setGuestLimitTrigger(null);
      setIsBackstopDismissed(true);
    },
    creditShortageTrigger,
    closeCreditShortageDialog: () => setCreditShortageTrigger(null),
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
    backDialogOpen: isBackDialogOpen,
    onBackDialogOpenChange: setIsBackDialogOpen,
    handleHeaderBack,
    handleConfirmBack,
  };
}
