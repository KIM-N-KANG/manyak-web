'use client';

import { useEffect, useRef, useState } from 'react';

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
  CreateSimpleStoryRequest,
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
import {
  clearOnboardingEntry,
  isOnboardingEntry,
} from '@/features/onboarding/utils/onboarding-entry-storage';
import type {
  PendingCreationRequest,
  StoryDraftRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  loadPendingCreationRequest,
  savePendingCreationRequest,
  takePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { saveCreatedStoryId } from '@/features/stories/_shared/utils/story-id-storage';
import { createClientId } from '@/lib/create-client-id';
import { FetchError } from '@/lib/custom-fetch';
import type {
  CreditShortageTrigger,
  GuestLimitTrigger,
} from '@/observability/analytics';
import { track } from '@/observability/analytics';
import { trackMetaPixelOnce } from '@/observability/marketing/pixel';

import type { StoryCreateStep } from '../types';
import type { BackExitOutcome } from '../utils/back-exit-draft';
import { resolveBackExit } from '../utils/back-exit-draft';
import {
  resolveErrorSettlement,
  resolveSuccessSettlement,
} from '../utils/creation-request-recovery';
import { mapStepToSpec } from '../utils/step-analytics';
import { getSelectedTagsByCategory } from '../utils/tag-categories';
import { useAdditionalInfos } from './use-additional-infos';
import { useCreationRequestRecovery } from './use-creation-request-recovery';
import { usePreventPageLeave } from './use-prevent-page-leave';
import { useStoryCreateDraft } from './use-story-create-draft';

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
  // 복구 조회가 실패를 알린 경우의 스토리라인 오류 표시(뮤테이션 isError를 대신한다).
  const [hasRecoveredGenerateError, setHasRecoveredGenerateError] =
    useState(false);
  // 마지막 완성 요청. 같은 페이로드의 재시도는 requestId를 재사용해 서버 멱등 계약으로
  // 중복 생성·중복 과금을 막는다.
  const lastCompletionRequestRef = useRef<CreateSimpleStoryRequest | null>(
    null,
  );
  // 직전 완성 시도가 requestId를 재사용했는지 여부(409 응답을 복구 조회로 돌릴 판단 근거).
  const reusedCompletionRequestIdRef = useRef<string | null>(null);
  const {
    additionalInfos,
    canAddAdditionalInfo,
    addAdditionalInfo,
    removeAdditionalInfo,
    changeAdditionalInfo,
    registerAdditionalInfoInput,
    getSubmittedAdditionalInfos,
    resetAdditionalInfos,
    restoreAdditionalInfos,
  } = useAdditionalInfos();

  // 뮤테이션 콜백은 페이지 이탈(언마운트) 후에도 실행되므로, 응답 정착 판정에
  // 쓸 마운트 여부를 ref로 추적한다. StrictMode 재마운트를 위해 effect에서 되살린다.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const simpleStoryTags = useGetSimpleStoryTags();

  // 온보딩에서 replace로 진입했는지. 마운트 시 한 번만 읽고(lazy 초기화),
  // 이 진입에만 적용되도록 곧바로 기록을 지운다.
  const [cameFromOnboarding] = useState(() => isOnboardingEntry());

  useEffect(() => {
    clearOnboardingEntry();
  }, []);

  const shouldConfirmBack = step !== 'keyword';

  const { confirmLeave, leaveAfterCleanup } = usePreventPageLeave({
    warnOnUnload: shouldConfirmBack,
    interceptBack: shouldConfirmBack || cameFromOnboarding,
    onBackAttempt: () => handleBackAttempt(),
  });

  // 온보딩에서 replace로 진입하면 앱 내에 돌아갈 히스토리가 없으므로
  // 더미 항목만 정리하고 홈으로 대체 이동한다.
  const exitToHome = () =>
    leaveAfterCleanup(() => router.replace(APP_PATH.MAIN.STORIES));

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
        // 이탈 후 도착한 응답은 레코드를 남겨 홈 배너를 유지하고,
        // 재진입 시 복구 조회가 결과를 되찾게 한다(성공 부수효과도 그쪽에서 수행).
        if (resolveSuccessSettlement(isMountedRef.current) !== 'apply') {
          return;
        }

        // 복구 조회가 결과를 선점 반영했으면 이중 적용(카운터·화면 전환)을 건너뛴다.
        if (!takePendingCreationRequest(variables.data.requestId)) {
          return;
        }

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
      onError: (error, variables) => {
        // 이탈 후 도착한 오류는 화면에 알릴 수 없으니 레코드를 남겨
        // 재진입 복구 조회가 실패·완료를 판정하게 한다. 마운트 상태에서는
        // 서버가 응답한 실패는 레코드를 지우고, 네트워크 오류는 보존한다.
        const settlement = resolveErrorSettlement(isMountedRef.current, error);

        if (settlement === 'defer-to-recovery') {
          return;
        }

        if (settlement === 'discard-record') {
          takePendingCreationRequest(variables.data.requestId);
        }

        handlePaymentRequiredError(error, 'storyline_generate');
      },
    },
  });
  const createChat = useCreateChat({
    mutation: {
      onSuccess: async (response) => {
        // 이탈 후 도착한 응답에 홈에서 강제 이동·토스트가 실행되지 않게 한다.
        if (!isMountedRef.current) {
          return;
        }

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
        if (!isMountedRef.current) {
          return;
        }

        handlePaymentRequiredError(error, 'chat_start');
        failToAdditionalInfo('chat');
      },
    },
  });

  const createStory = useCreateSimpleStory({
    mutation: {
      onSuccess: (response, variables) => {
        // 이탈 후 도착한 응답은 레코드를 남겨 재진입 복구 조회가 완성 결과와
        // 채팅 생성까지 이어가게 한다(언마운트 상태의 강제 이동·토스트 방지).
        if (resolveSuccessSettlement(isMountedRef.current) !== 'apply') {
          return;
        }

        // 복구 조회가 결과를 선점 반영했으면 이중 적용(채팅 중복 생성 등)을 건너뛴다.
        if (!takePendingCreationRequest(variables.data.requestId)) {
          return;
        }

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
      onError: (error, variables) => {
        // 이탈 후 도착한 오류는 레코드를 남겨 재진입 복구 조회에 맡긴다.
        const settlement = resolveErrorSettlement(isMountedRef.current, error);

        if (settlement === 'defer-to-recovery') {
          return;
        }

        // 재사용한 requestId의 409는 실패가 아니라 "서버에 결과가 있거나 곧 생긴다"는
        // 신호다(멱등 계약 — PENDING 재POST). 실패 처리 대신 복구 조회로 되찾는다.
        if (
          error instanceof FetchError &&
          error.status === 409 &&
          reusedCompletionRequestIdRef.current === variables.data.requestId &&
          loadPendingCreationRequest()?.requestId === variables.data.requestId
        ) {
          // 레코드를 남겨 두면 뮤테이션 종료와 함께 복구 폴링이 자동 활성화된다.
          return;
        }

        if (settlement === 'discard-record') {
          takePendingCreationRequest(variables.data.requestId);
        }

        handlePaymentRequiredError(error, 'story_create');
        failToAdditionalInfo('story');
      },
    },
  });

  // 완성 단계 복구 레코드의 퍼널 컨텍스트를 복원한다. 메모리 상태가 살아 있는
  // 같은 마운트에서는 입력을 덮어쓰지 않도록 재진입(컨텍스트 소실)일 때만 통째로 복원한다.
  const restoreCompletionContext = (
    record: Extract<PendingCreationRequest, { stage: 'STORY_COMPLETION' }>,
  ) => {
    if (generationResult !== null) {
      return;
    }

    setGenerationRequest(record.generationRequest);
    setGenerationResult(record.generationResult);
    setSelectedStoryline(record.selectedStoryline);
    setSelectedRecommendations(new Set());
    restoreAdditionalInfos(record.completionRequest.additionalInfos ?? []);
    lastCompletionRequestRef.current = record.completionRequest;
  };

  const recovery = useCreationRequestRecovery({
    // 원 생성 요청이 진행 중이면 원 응답을 우선하고, 끝난 뒤에도 레코드가 남아
    // 있을 때(재진입·응답 유실)만 복구 조회를 시작한다.
    suspended: generateStorylines.isPending || createStory.isPending,
    onRestorePending: (record) => {
      if (record.stage === 'STORYLINE_GENERATION') {
        // 네트워크 오류로 남은 뮤테이션 오류 상태가 복구 로딩과 겹쳐 보이지 않게 지운다.
        if (generateStorylines.isError) {
          generateStorylines.reset();
        }

        setGenerationRequest(record.generationRequest);
        setHasRecoveredGenerateError(false);
        setStep('storyline-select');

        return;
      }

      restoreCompletionContext(record);
      setHasCompleteStoryError(false);
      setStep('complete');
    },
    onStorylinesCompleted: (record, result) => {
      if (generateStorylines.isError) {
        generateStorylines.reset();
      }

      // 원 onSuccess가 실행되지 못했으므로 성공 부수효과(카운터·픽셀)를 여기서 수행한다.
      if (sessionStatus !== 'authenticated') {
        incrementGuestUsage('storylineCreate');
      }

      trackMetaPixelOnce('StorylinesGenerated');

      setGenerationRequest(record.generationRequest);
      setGenerationResult(result);
      setActiveStorylineIndex(0);
      setSelectedStoryline(null);
      setHasRecoveredGenerateError(false);
      setStep('storyline-select');
    },
    onStoryCompleted: (record, result) => {
      if (record.stage !== 'STORY_COMPLETION') {
        return;
      }

      restoreCompletionContext(record);

      const storyId = result.id;

      if (typeof storyId !== 'string') {
        failToAdditionalInfo('story');

        return;
      }

      // 원 createStory.onSuccess와 동일한 성공 부수효과를 수행하고 채팅 생성으로 잇는다.
      if (sessionStatus === 'authenticated') {
        void queryClient.invalidateQueries({
          queryKey: getGetMyStoriesQueryKey(),
        });
      } else {
        saveCreatedStoryId(storyId);
        incrementGuestUsage('storyCreate');
      }

      setCreatedStoryId(storyId);
      completedStoryRef.current = { storyId, genres: result.genres };
      trackMetaPixelOnce('StoryCompiled');
      setStep('complete');
      createChat.mutate({ data: { storyId } });
    },
    onFailed: (record) => {
      if (record.stage === 'STORYLINE_GENERATION') {
        setGenerationRequest(record.generationRequest);
        setHasRecoveredGenerateError(true);
        setStep('storyline-select');

        return;
      }

      restoreCompletionContext(record);
      failToAdditionalInfo('story');
    },
  });

  // 임시 저장(draft) 복원: 레코드의 퍼널 컨텍스트를 통째로 되살리고 저장된
  // 스텝으로 이동한다. createdStoryId·completionRequest는 완성 재시도 멱등
  // 로직(requestId 재사용, 스토리 중복 생성 방지)에 합류시킨다.
  const restoreDraft = (record: StoryDraftRecord) => {
    setGenerationRequest(record.generationRequest);
    setGenerationResult(record.generationResult);
    setActiveStorylineIndex(record.activeStorylineIndex);
    setSelectedStoryline(record.selectedStoryline);
    setSelectedRecommendations(new Set(record.selectedRecommendations));
    restoreAdditionalInfos(record.additionalInfos);
    setCreatedStoryId(record.createdStoryId);

    if (record.createdStoryId !== null) {
      completedStoryRef.current = { storyId: record.createdStoryId };
    }

    lastCompletionRequestRef.current = record.completionRequest;
    setHasCompleteStoryError(false);
    setHasRecoveredGenerateError(false);
    setStep(record.step);
  };

  const draft = useStoryCreateDraft({ onRestore: restoreDraft });

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

  // 스토리라인 생성 요청에 새 requestId를 부여하고 복구 레코드를 저장한 뒤 요청한다.
  // 생성·재생성 각각이 새 시도이므로 매번 새 UUID를 쓴다.
  //
  // 재생성이면 직전 시도의 requestId를 parentCreationId로 실어 Langfuse 여정을 잇는다(스펙 §3-8).
  // 체인 방식이라 항상 "바로 직전" 값만 가리키며, 최초 생성은 부모가 없어 null이다. 재생성은
  // 직전 요청 전체(input)를 그대로 다시 보내는 구조라, 값을 명시하지 않으면 직전 요청의
  // parentCreationId가 스프레드로 딸려와 조부모를 가리키게 되므로 매번 덮어쓴다.
  const requestGenerateStorylines = (
    input: Omit<GenerateSimpleStorylinesRequest, 'requestId'>,
    parentCreationId: string | null = null,
  ) => {
    const request: GenerateSimpleStorylinesRequest = {
      ...input,
      requestId: createClientId(),
      parentCreationId,
    };

    savePendingCreationRequest({
      stage: 'STORYLINE_GENERATION',
      requestId: request.requestId,
      generationRequest: request,
    });
    setGenerationRequest(request);
    setHasRecoveredGenerateError(false);
    generateStorylines.mutate({ data: request });
  };

  const handleGenerateStorylines = (
    request: Omit<GenerateSimpleStorylinesRequest, 'requestId'>,
  ) => {
    if (guardGuestLimit('storylineCreate', 'storyline_generate')) {
      return;
    }

    setGenerationResult(null);
    setActiveStorylineIndex(0);
    setSelectedStoryline(null);
    setIsGuestLimitReached(false);
    resetAdditionalInfoStep();
    setStep('storyline-select');
    track('client_storyCreate_storyGeneration_requested');
    requestGenerateStorylines(request);
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
    requestGenerateStorylines(generationRequest, generationRequest.requestId);
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

    const payload = {
      simpleCreationId: simpleCreationId,
      storylineId: selectedStoryline.id,
      additionalInfos: [
        ...selectedRecommendations,
        ...getSubmittedAdditionalInfos(),
      ],
    };
    // 같은 페이로드의 재시도는 requestId를 재사용한다. 서버가 이미 완성했다면(응답 유실)
    // AI 재호출 없이 저장된 결과를 돌려받아 중복 생성·중복 과금이 없다(멱등 계약).
    const lastRequest = lastCompletionRequestRef.current;
    const isSamePayload =
      lastRequest !== null &&
      lastRequest.simpleCreationId === payload.simpleCreationId &&
      lastRequest.storylineId === payload.storylineId &&
      JSON.stringify(lastRequest.additionalInfos ?? []) ===
        JSON.stringify(payload.additionalInfos);
    const request: CreateSimpleStoryRequest = {
      ...payload,
      requestId: isSamePayload ? lastRequest.requestId : createClientId(),
    };

    lastCompletionRequestRef.current = request;
    reusedCompletionRequestIdRef.current = isSamePayload
      ? request.requestId
      : null;

    // 재진입 복원에 필요한 퍼널 컨텍스트가 온전할 때만 복구 레코드를 저장한다.
    // (완료 조건상 이 시점에 항상 존재하지만 타입 좁히기를 겸한다.)
    if (generationRequest !== null && generationResult !== null) {
      savePendingCreationRequest({
        stage: 'STORY_COMPLETION',
        requestId: request.requestId,
        generationRequest,
        generationResult,
        selectedStoryline,
        completionRequest: request,
      });
    }

    createStory.mutate({ data: request });
  };

  // 진행 중 요청이 있으면 슬롯을 유지하고, 생성 결과가 있으면 draft로 저장한다.
  const resolveCurrentBackExit = () =>
    resolveBackExit({
      slotRecord: loadPendingCreationRequest(),
      step,
      generationRequest,
      generationResult,
      activeStorylineIndex,
      selectedStoryline,
      additionalInfos: getSubmittedAdditionalInfos(),
      selectedRecommendations: [...selectedRecommendations],
      createdStoryId,
      completionRequest: lastCompletionRequestRef.current,
      draftRequestId: createClientId(),
    });

  // 이탈 확정 공통 처리: 저장할 결과가 있으면 draft로 저장하고, 내용이
  // 보존되는 이탈(임시 저장·진행 중 복구)이면 토스트로 알린 뒤 떠난다.
  const exitWithOutcome = (outcome: BackExitOutcome) => {
    if (outcome.type === 'save-draft') {
      savePendingCreationRequest(outcome.record);
      track('client_storyCreate_draftSaved', { step: outcome.record.step });
    }

    if (outcome.type !== 'discard') {
      toast.success(TOAST_MESSAGE.STORY_DRAFT_SAVED);
    }

    if (cameFromOnboarding) {
      exitToHome();

      return;
    }

    confirmLeave();
  };

  // 뒤로가기 이탈 시도: 내용이 보존되면 묻지 않고 즉시 이탈하고,
  // 보존할 수 없을 때만 소실 경고 다이얼로그를 띄운다.
  const handleBackAttempt = () => {
    // 키워드 스텝은 지울 내용이 없다. 온보딩에서 진입해 뒤로가기를 흡수한
    // 경우이므로 확인 없이 홈으로 나간다.
    if (!shouldConfirmBack) {
      exitToHome();

      return;
    }

    const outcome = resolveCurrentBackExit();

    if (outcome.type === 'discard') {
      setIsBackDialogOpen(true);

      return;
    }

    track('client_storyCreate_exitButton_clicked', mapStepToSpec(step));
    exitWithOutcome(outcome);
  };

  const handleHeaderBack = () => {
    if (shouldConfirmBack) {
      handleBackAttempt();

      return;
    }

    if (cameFromOnboarding) {
      exitToHome();

      return;
    }

    router.back();
  };

  // 소실 경고 다이얼로그에서 이탈을 확정한 경우. 다이얼로그가 열린 사이 상태가
  // 변할 수 있으므로 이탈 판정은 확정 시점에 다시 수행한다.
  const handleConfirmBack = () => {
    track('client_storyCreate_exitButton_clicked', mapStepToSpec(step));
    setIsBackDialogOpen(false);
    exitWithOutcome(resolveCurrentBackExit());
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
    isGeneratingStorylines:
      generateStorylines.isPending ||
      recovery.recoveringStage === 'STORYLINE_GENERATION',
    hasGenerateStorylinesError:
      generateStorylines.isError || hasRecoveredGenerateError,
    isCompletingStory:
      createStory.isPending ||
      createChat.isPending ||
      recovery.recoveringStage === 'STORY_COMPLETION',
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
    resumeDialogOpen: draft.isResumeDialogOpen,
    handleResumeContinue: draft.handleResumeContinue,
    handleResumeDiscard: draft.handleResumeDiscard,
    closeResumeDialog: draft.closeResumeDialog,
    handleHeaderBack,
    handleConfirmBack,
  };
}
