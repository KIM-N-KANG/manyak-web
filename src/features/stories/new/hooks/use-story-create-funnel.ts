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
import { showCreditShortageToast } from '@/features/auth/_shared/utils/show-credit-shortage-toast';
import { saveCreatedChatId } from '@/features/chats/_shared/utils/chat-id-storage';
import type {
  DraftCreationRecord,
  PendingCreationRequest,
  StoryDraftRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  loadPendingCreationRequest,
  markPendingStoryCreated,
  replacePendingCreationRequest,
  saveDraftCreationRecord,
  savePendingCreationRequest,
  takePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { saveCreatedStoryId } from '@/features/stories/_shared/utils/story-id-storage';
import { createClientId } from '@/lib/create-client-id';
import { FetchError } from '@/lib/custom-fetch';
import type { GuestLimitTrigger } from '@/observability/analytics';
import { track } from '@/observability/analytics';
import { trackMetaPixelOnce } from '@/observability/marketing/pixel';

import type { StoryCreateBackDialogVariant } from '../components/header/story-create-back-dialog';
import type { StoryCreateStep } from '../types';
import {
  resolveErrorSettlement,
  resolveSuccessSettlement,
} from '../utils/creation-request-recovery';
import { mapStepToSpec } from '../utils/step-analytics';
import { getSelectedKeywordGroups } from '../utils/tag-categories';
import { useAdditionalInfos } from './use-additional-infos';
import { useCreationRequestRecovery } from './use-creation-request-recovery';
import { usePreventPageLeave } from './use-prevent-page-leave';
import { useStoryCreateDraft } from './use-story-create-draft';
import { useStoryDraftAutosave } from './use-story-draft-autosave';
import { useStoryTagStep } from './use-story-tag-step';

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
  const [isGuestLimitReached, setIsGuestLimitReached] = useState(false);
  const [backDialog, setBackDialog] =
    useState<StoryCreateBackDialogVariant | null>(null);
  const [isReselectDialogOpen, setIsReselectDialogOpen] = useState(false);
  const [keywordDraftRequestId, setKeywordDraftRequestId] =
    useState(createClientId);
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
  const [lastCompletionRequest, setLastCompletionRequest] =
    useState<CreateSimpleStoryRequest | null>(null);
  // 직전 완성 시도가 requestId를 재사용했는지 여부(409 응답을 복구 조회로 돌릴 판단 근거).
  const reusedCompletionRequestIdRef = useRef<string | null>(null);
  const reusedGenerationRequestIdRef = useRef<string | null>(null);
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

  const shouldConfirmBack = step !== 'keyword';

  const { leaveAfterCleanup } = usePreventPageLeave({
    warnOnUnload: shouldConfirmBack,
    interceptBack: true,
    onBackAttempt: () => handleBackAttempt(),
  });

  // 진입 이력과 관계없이 퍼널 이탈은 제작 탭으로 정착시킨다.
  const exitToCreate = () =>
    leaveAfterCleanup(() => router.replace(APP_PATH.MAIN.STUDIO));

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

  // 402 처리: 게스트 체험 한도면 로그인 유도, 회원 이프 부족이면 토스트를 띄운다.
  // 사유는 응답 바디 code로 구분하고(백엔드 KNK-524), code가 없으면 세션 상태로 폴백한다.
  // 퍼널의 기존 에러 복귀(failToAdditionalInfo)는 호출부에서 그대로 수행되고, 이 핸들러는 안내 UI만 띄운다.
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

    if (reason === 'insufficient-credit' && trigger === 'story_create') {
      showCreditShortageToast(trigger);
    }
  };

  // 확정된 게스트가 해당 액션 한도에 도달했으면 로그인 유도 바텀 시트를 열고 true를 반환한다.
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
        // 이탈 후 도착한 응답은 레코드를 남겨 제작 탭 배너를 유지하고,
        // 재진입 시 복구 조회가 결과를 되찾게 한다(성공 부수효과도 그쪽에서 수행).
        if (resolveSuccessSettlement(isMountedRef.current) !== 'apply') {
          return;
        }

        if (response.status !== 201) {
          return;
        }

        const draftRecord: StoryDraftRecord = {
          stage: 'STORY_DRAFT',
          requestId: variables.data.requestId,
          step: 'storyline-select',
          generationRequest: variables.data,
          generationResult: response.data,
          activeStorylineIndex: 0,
          selectedStoryline: null,
          additionalInfos: [],
          selectedRecommendations: [],
          createdStoryId: null,
          completionRequest: null,
        };

        // 복구 조회가 결과를 선점 반영했으면 이중 적용을 건너뛴다. 성공 결과는
        // 즉시 draft로 승격해 다음 편집 자동 저장의 기준점으로 남긴다.
        if (
          !replacePendingCreationRequest(variables.data.requestId, draftRecord)
        ) {
          return;
        }

        draftAutosave.markCurrentAsSaved(true);

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

        // 실패 재시도에 재사용한 requestId가 서버의 기존 PENDING과 겹친 409는
        // 실패가 아니라 진행 중 신호다. 레코드를 유지해 복구 폴링으로 합류한다.
        if (
          error instanceof FetchError &&
          error.status === 409 &&
          reusedGenerationRequestIdRef.current === variables.data.requestId &&
          loadPendingCreationRequest()?.requestId === variables.data.requestId
        ) {
          draftAutosave.setPersistedStatus(true);

          return;
        }

        if (settlement === 'discard-record') {
          takePendingCreationRequest(variables.data.requestId);
          draftAutosave.setPersistedStatus(false);
        } else {
          draftAutosave.setPersistedStatus(true);
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

        const pendingRecord = loadPendingCreationRequest();

        if (
          pendingRecord?.stage === 'STORY_COMPLETION' ||
          pendingRecord?.stage === 'STORY_DRAFT'
        ) {
          takePendingCreationRequest(pendingRecord.requestId);
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

        // 채팅 생성은 이프를 소모하지 않는다. 게스트 한도 응답만 로그인 유도로 처리한다.
        if (
          resolvePaymentRequiredReason(error, sessionStatus) ===
          'guest-trial-limit'
        ) {
          setGuestLimitTrigger('chat_start');
        }

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

        // 채팅이 성공하기 전까지 완성 레코드를 유지해야 새로고침 후에도 같은
        // requestId의 완료 결과를 되찾아 스토리를 중복 생성하지 않는다.
        if (
          loadPendingCreationRequest()?.requestId !== variables.data.requestId
        ) {
          return;
        }

        if (response.status !== 201) {
          failToAdditionalInfo('story');

          return;
        }

        const storyId = response.data.id;

        if (typeof storyId === 'string') {
          // 채팅 생성 전에 새로고침돼도 복구가 스토리 성공 부수효과를 다시
          // 적용하지 않도록 완성 레코드에 생성된 ID를 먼저 확정한다.
          markPendingStoryCreated(variables.data.requestId, storyId);

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
          draftAutosave.setPersistedStatus(true);

          return;
        }

        if (settlement === 'discard-record') {
          takePendingCreationRequest(variables.data.requestId);
          draftAutosave.markCurrentAsSaved(
            storyDraftCandidate !== null &&
              saveDraftCreationRecord(storyDraftCandidate),
          );
        } else {
          draftAutosave.setPersistedStatus(true);
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
    setActiveStorylineIndex(record.activeStorylineIndex ?? 0);
    setSelectedStoryline(record.selectedStoryline);
    setSelectedRecommendations(new Set(record.selectedRecommendations ?? []));
    restoreAdditionalInfos(
      record.additionalInfos ?? record.completionRequest.additionalInfos ?? [],
    );
    setLastCompletionRequest(record.completionRequest);
  };

  const recovery = useCreationRequestRecovery({
    // 원 생성 요청이 진행 중이면 원 응답을 우선하고, 끝난 뒤에도 레코드가 남아
    // 있을 때(재진입·응답 유실)만 복구 조회를 시작한다.
    suspended:
      generateStorylines.isPending ||
      createStory.isPending ||
      createChat.isPending ||
      createdStoryId !== null,
    onRestorePending: (record) => {
      draftAutosave.setPersistedStatus(true);

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

      const saved = saveDraftCreationRecord({
        stage: 'STORY_DRAFT',
        requestId: record.requestId,
        step: 'storyline-select',
        generationRequest: record.generationRequest,
        generationResult: result,
        activeStorylineIndex: 0,
        selectedStoryline: null,
        additionalInfos: [],
        selectedRecommendations: [],
        createdStoryId: null,
        completionRequest: null,
      });

      draftAutosave.markCurrentAsSaved(saved);

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

      // 원 응답에서 이미 storyId를 확정한 레코드는 채팅 실패 후 재진입한
      // 경우다. 이때 게스트 카운터·로컬 ID를 다시 적용하지 않고 채팅만 잇는다.
      if (record.createdStoryId !== storyId) {
        markPendingStoryCreated(record.requestId, storyId);

        if (sessionStatus === 'authenticated') {
          void queryClient.invalidateQueries({
            queryKey: getGetMyStoriesQueryKey(),
          });
        } else {
          saveCreatedStoryId(storyId);
          incrementGuestUsage('storyCreate');
        }

        trackMetaPixelOnce('StoryCompiled');
      }

      setCreatedStoryId(storyId);
      completedStoryRef.current = { storyId, genres: result.genres };
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
      draftAutosave.markCurrentAsSaved(
        saveDraftCreationRecord({
          stage: 'STORY_DRAFT',
          requestId: record.requestId,
          step: 'additional-info',
          generationRequest: record.generationRequest,
          generationResult: record.generationResult,
          activeStorylineIndex: record.activeStorylineIndex ?? 0,
          selectedStoryline: record.selectedStoryline,
          additionalInfos:
            record.additionalInfos ??
            record.completionRequest.additionalInfos ??
            [],
          selectedRecommendations: record.selectedRecommendations ?? [],
          createdStoryId: null,
          completionRequest: record.completionRequest,
        }),
      );
      failToAdditionalInfo('story');
    },
  });

  const storylines = getGeneratedStorylines(generationResult);
  const selectedTagGroups = getSelectedKeywordGroups(
    generationRequest,
    simpleStoryTags.data?.data ?? [],
  );
  const activeStoryline =
    storylines[activeStorylineIndex] ?? storylines[0] ?? null;
  const simpleCreationId = generationResult?.simpleCreationId;
  const canCompleteStory =
    typeof simpleCreationId === 'number' &&
    typeof selectedStoryline?.id === 'number';

  const isGeneratingStorylines =
    generateStorylines.isPending ||
    recovery.recoveringStage === 'STORYLINE_GENERATION';
  const tagStep = useStoryTagStep({
    isGeneratingStorylines,
    onGenerateStorylines: handleGenerateStorylines,
  });

  // 임시 저장 복원: 키워드는 입력만 복원하고 첫 탭에서 시작한다. 스토리 draft는
  // 퍼널 컨텍스트를 통째로 되살려 완성·채팅 재시도 멱등 흐름에 합류시킨다.
  const restoreDraft = (record: DraftCreationRecord) => {
    setKeywordDraftRequestId(record.requestId);

    if (record.stage === 'KEYWORD_DRAFT') {
      tagStep.restoreKeywordDraft(record.snapshot);
      setStep('keyword');
      draftAutosave.markCurrentAsSaved(true);

      return;
    }

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

    setLastCompletionRequest(record.completionRequest);
    setHasCompleteStoryError(false);
    setHasRecoveredGenerateError(false);
    setStep(record.step);
    draftAutosave.markCurrentAsSaved(true);
  };

  const draft = useStoryCreateDraft({ onRestore: restoreDraft });

  const storyDraftStep =
    step === 'storyline-select' ? 'storyline-select' : 'additional-info';
  const storyDraftCandidate: StoryDraftRecord | null =
    step !== 'keyword' &&
    generationRequest !== null &&
    generationResult !== null &&
    (storyDraftStep !== 'additional-info' || selectedStoryline !== null)
      ? {
          stage: 'STORY_DRAFT',
          requestId: generationRequest.requestId,
          step: storyDraftStep,
          generationRequest,
          generationResult,
          activeStorylineIndex,
          selectedStoryline,
          additionalInfos: additionalInfos.map(({ value }) => value),
          selectedRecommendations: [...selectedRecommendations],
          createdStoryId,
          completionRequest: lastCompletionRequest,
        }
      : null;
  const draftCandidate: DraftCreationRecord | null =
    storyDraftCandidate ??
    (step === 'keyword' && tagStep.hasKeywordInput
      ? {
          stage: 'KEYWORD_DRAFT',
          requestId: keywordDraftRequestId,
          snapshot: tagStep.keywordDraftSnapshot,
        }
      : null);
  const draftFingerprint = JSON.stringify(draftCandidate);
  const isDraftAutosaveEnabled =
    draft.isEntryResolved &&
    !generateStorylines.isPending &&
    !createStory.isPending &&
    !createChat.isPending &&
    createdStoryId === null &&
    recovery.recoveringStage === null &&
    step !== 'complete';

  const persistDraftCandidate = (record: DraftCreationRecord | null) => {
    if (record !== null) {
      const saved = saveDraftCreationRecord(record);

      if (saved) {
        track('client_storyCreate_draftSaved', {
          step: record.stage === 'KEYWORD_DRAFT' ? 'keyword' : record.step,
        });
      }

      return saved;
    }

    const current = loadPendingCreationRequest();

    if (
      current?.stage === 'KEYWORD_DRAFT' &&
      current.requestId === keywordDraftRequestId
    ) {
      takePendingCreationRequest(current.requestId);
    }

    return false;
  };

  const draftAutosave = useStoryDraftAutosave({
    candidate: draftCandidate,
    fingerprint: draftFingerprint,
    enabled: isDraftAutosaveEnabled,
    persist: persistDraftCandidate,
  });

  // 스토리라인 생성 요청에 requestId를 부여하고 복구 레코드를 저장한 뒤 요청한다.
  // 일반 생성·재생성은 새 UUID를 쓰고, 실패한 같은 요청의 복구 재시도만 기존 ID를 재사용한다.
  //
  // 재생성이면 직전 시도의 requestId를 parentCreationId로 실어 Langfuse 여정을 잇는다(스펙 §3-8).
  // 체인 방식이라 항상 "바로 직전" 값만 가리키며, 최초 생성은 부모가 없어 null이다. 재생성은
  // 직전 요청 전체(input)를 그대로 다시 보내는 구조라, 값을 명시하지 않으면 직전 요청의
  // parentCreationId가 스프레드로 딸려와 조부모를 가리키게 되므로 매번 덮어쓴다.
  const requestGenerateStorylines = (
    input: Omit<GenerateSimpleStorylinesRequest, 'requestId'>,
    parentCreationId: string | null = null,
    reusedRequestId: string | null = null,
  ) => {
    const request: GenerateSimpleStorylinesRequest = {
      ...input,
      requestId: reusedRequestId ?? createClientId(),
      parentCreationId:
        reusedRequestId === null
          ? parentCreationId
          : (input.parentCreationId ?? null),
    };

    reusedGenerationRequestIdRef.current = reusedRequestId;
    draftAutosave.cancel();

    const saved = savePendingCreationRequest({
      stage: 'STORYLINE_GENERATION',
      requestId: request.requestId,
      generationRequest: request,
    });

    draftAutosave.setPersistedStatus(saved);
    setGenerationRequest(request);
    setHasRecoveredGenerateError(false);
    generateStorylines.mutate({ data: request });
  };

  function handleGenerateStorylines(
    request: Omit<GenerateSimpleStorylinesRequest, 'requestId'>,
  ) {
    if (guardGuestLimit('storylineCreate', 'storyline_generate')) {
      return;
    }

    setGenerationResult(null);
    setActiveStorylineIndex(0);
    setSelectedStoryline(null);
    setCreatedStoryId(null);
    setLastCompletionRequest(null);
    completedStoryRef.current = null;
    reusedCompletionRequestIdRef.current = null;
    setIsGuestLimitReached(false);
    resetAdditionalInfoStep();
    setStep('storyline-select');
    track('client_storyCreate_storyGeneration_requested');
    requestGenerateStorylines(request);
  }

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

    const isFailureRetry =
      generateStorylines.isError || hasRecoveredGenerateError;

    setIsGuestLimitReached(false);
    requestGenerateStorylines(
      generationRequest,
      generationRequest.requestId,
      isFailureRetry ? generationRequest.requestId : null,
    );
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

  const confirmBackToStorylineSelect = () => {
    setIsReselectDialogOpen(false);
    track('client_storyCreate_backToStorylineButton_clicked');
    setSelectedStoryline(null);
    resetAdditionalInfoStep();
    setStep('storyline-select');
  };

  const handleBackToStorylineSelect = () => {
    const hasAdditionalInfo =
      selectedRecommendations.size > 0 ||
      additionalInfos.some(({ value }) => value.trim().length > 0);

    if (hasAdditionalInfo) {
      setIsReselectDialogOpen(true);

      return;
    }

    confirmBackToStorylineSelect();
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
    const lastRequest = lastCompletionRequest;
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

    setLastCompletionRequest(request);
    reusedCompletionRequestIdRef.current = isSamePayload
      ? request.requestId
      : null;

    // 재진입 복원에 필요한 퍼널 컨텍스트가 온전할 때만 복구 레코드를 저장한다.
    // (완료 조건상 이 시점에 항상 존재하지만 타입 좁히기를 겸한다.)
    if (generationRequest !== null && generationResult !== null) {
      draftAutosave.cancel();

      const saved = savePendingCreationRequest({
        stage: 'STORY_COMPLETION',
        requestId: request.requestId,
        generationRequest,
        generationResult,
        activeStorylineIndex,
        selectedStoryline,
        additionalInfos: additionalInfos.map(({ value }) => value),
        selectedRecommendations: [...selectedRecommendations],
        createdStoryId: null,
        completionRequest: request,
      });

      draftAutosave.setPersistedStatus(saved);
    }

    createStory.mutate({ data: request });
  };

  /** 예약된 편집을 즉시 저장한 뒤 제작 탭으로 나간다. */
  const flushAndExit = () => {
    draftAutosave.flushCurrent();
    exitToCreate();
  };

  // X·브라우저 뒤로가기 이탈 시도: 이탈은 늘 확인을 거친다(Android 패리티). 보존되는
  // 내용(자동 저장본·진행 중 요청·생성 결과)이 있으면 이어서 만들 수 있다는 확인을,
  // 저장할 수 없으면 소실 경고를 띄운다. 키워드 단계에서 입력이 비어 있으면 잃을 것이
  // 없으므로 묻지 않고 조용히 나간다.
  const handleBackAttempt = () => {
    if (step === 'keyword') {
      if (!tagStep.hasKeywordInput) {
        track('client_storyCreate_exitButton_clicked', mapStepToSpec(step));
        flushAndExit();

        return;
      }

      setBackDialog('saved');

      return;
    }

    const slotRecord = loadPendingCreationRequest();
    const hasPreservedContent =
      generationResult !== null ||
      slotRecord?.stage === 'STORYLINE_GENERATION' ||
      slotRecord?.stage === 'STORY_COMPLETION';

    setBackDialog(hasPreservedContent ? 'saved' : 'lost');
  };

  const handleHeaderBack = () => handleBackAttempt();

  // 이탈 확인 다이얼로그에서 이탈을 확정한 경우. 보존 이탈은 예약된 편집을 즉시 저장하고
  // 나가며, 소실 이탈은 저장 없이 나간다.
  const handleConfirmBack = () => {
    track('client_storyCreate_exitButton_clicked', mapStepToSpec(step));

    const variant = backDialog;

    setBackDialog(null);

    if (variant === 'saved') {
      flushAndExit();

      return;
    }

    exitToCreate();
  };

  const handleResumeDiscard = () => {
    draft.handleResumeDiscard();
    setKeywordDraftRequestId(createClientId());
    draftAutosave.setPersistedStatus(false);
  };

  return {
    step,
    tagStep,
    draftSaveStatus: draftAutosave.status,
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
    isGeneratingStorylines,
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
    backDialog,
    onBackDialogOpenChange: (open: boolean) => {
      if (!open) {
        setBackDialog(null);
      }
    },
    reselectDialogOpen: isReselectDialogOpen,
    onReselectDialogOpenChange: setIsReselectDialogOpen,
    handleConfirmReselect: confirmBackToStorylineSelect,
    resumeDialogOpen: draft.isResumeDialogOpen,
    handleResumeContinue: draft.handleResumeContinue,
    handleResumeDiscard,
    closeResumeDialog: draft.closeResumeDialog,
    handleHeaderBack,
    handleConfirmBack,
  };
}
