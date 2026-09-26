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
import { getGetMyChatsQueryKey } from '@/api/generated/endpoints/users/users';
import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  useGuestConsent,
  useGuestConsentOpen,
} from '@/features/auth/_shared/components/guest-consent-provider';
import { resolvePaymentRequiredReason } from '@/features/auth/_shared/utils/guest-limit-error';
import {
  getTrialRemaining,
  type TrialKind,
} from '@/features/auth/_shared/utils/guest-trial';
import { showCreditShortageToast } from '@/features/auth/_shared/utils/show-credit-shortage-toast';
import { saveCreatedChatId } from '@/features/chats/_shared/utils/chat-id-storage';
import { useCreationEpoch } from '@/features/stories/_shared/hooks/use-creation-epoch';
import { getCreationEpoch } from '@/features/stories/_shared/utils/creation-db';
import {
  resolveErrorSettlement,
  resolveSuccessSettlement,
} from '@/features/stories/_shared/utils/creation-request-recovery';
import type {
  DraftCreationRecord,
  PendingCreationRequest,
  StoryDraftRecord,
  StorylineGenerationRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  addStoryCompletionRequest,
  buildStorylineDraftRecord,
  demotePendingCompletionToDraft,
  findPendingCreationRequest,
  replacePendingCreationRequest,
  saveDraftCreationRecord,
  savePendingCreationRequest,
  takePendingCreationRequest,
  takeStoryCompletionRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { applyStorylinesGeneratedEffects } from '@/features/stories/_shared/utils/creation-side-effects';
import { useTrials } from '@/hooks/use-trials';
import { createClientId } from '@/lib/create-client-id';
import { FetchError } from '@/lib/custom-fetch';
import { track } from '@/observability/analytics';

import type { StoryCreateBackDialogVariant } from '../components/header/story-create-back-dialog';
import type { StoryCreateStep } from '../types';
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
  const currentEpoch = useCreationEpoch();
  const [epoch, setEpoch] = useState(-1);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (active) setEpoch(getCreationEpoch());
    });

    return () => {
      active = false;
    };
  }, []);

  const storageBusy = useRef(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const queryClient = useQueryClient();
  const { status: sessionStatus } = useSession();
  const requestConsent = useGuestConsent();
  const guestConsentOpen = useGuestConsentOpen();
  const trials = useTrials();
  const [guestLimitOpen, setGuestLimitOpen] = useState(false);
  const awaitingAccess = useRef(false);
  const [step, setStep] = useState<StoryCreateStep>('keyword');
  const [generationRequest, setGenerationRequest] =
    useState<GenerateSimpleStorylinesRequest | null>(null);
  const [generationResult, setGenerationResult] =
    useState<GenerateSimpleStorylinesResponse | null>(null);
  const [settledGenerationRequestId, setSettledGenerationRequestId] = useState<
    string | null
  >(null);
  const [activeStorylineIndex, setActiveStorylineIndex] = useState(0);
  const [selectedStoryline, setSelectedStoryline] =
    useState<SimpleStorylineResponse | null>(null);
  const [createdStoryId, setCreatedStoryId] = useState<string | null>(null);
  const [hasCompleteStoryError, setHasCompleteStoryError] = useState(false);
  const [backDialog, setBackDialog] =
    useState<StoryCreateBackDialogVariant | null>(null);
  const [isReselectDialogOpen, setIsReselectDialogOpen] = useState(false);
  const [keywordDraftRequestId, setKeywordDraftRequestId] =
    useState(createClientId);
  const [selectedRecommendations, setSelectedRecommendations] = useState<
    Set<string>
  >(() => new Set());
  // 복구 조회가 실패를 알린 경우의 스토리라인 오류 표시(뮤테이션 isError를 대신한다).
  const [hasRecoveredGenerateError, setHasRecoveredGenerateError] =
    useState(false);
  // 마지막 완성 요청. 같은 페이로드의 재시도는 requestId를 재사용해 서버 멱등 계약으로
  // 중복 생성·중복 과금을 막는다.
  const [lastCompletionRequest, setLastCompletionRequest] =
    useState<CreateSimpleStoryRequest | null>(null);
  const reusedGenerationRequestIdRef = useRef<string | null>(null);
  // 이 퍼널 세션이 편집 초안 목록에 소유한 레코드의 requestId. 세션은 레코드를 최대 한 건만
  // 갖는다. 단계 전환(키워드 초안→생성 요청, 재생성, 복원 뒤 자동 저장)으로 requestId가
  // 바뀔 때 이전 레코드를 지워, 단일 슬롯이 덮어쓰기로 해 주던 정리를 명시적으로 대신한다.
  const ownedRequestIdRef = useRef<string | null>(null);

  /** 소유 초안의 교체는 저장소 트랜잭션이 처리한다. */
  const persistOwnRecord = async <Record extends PendingCreationRequest>(
    record: Record,
    write: (
      record: Record,
      epoch: number,
      previousId?: string | null,
    ) => Promise<boolean>,
  ) => {
    const saved = await write(record, epoch, ownedRequestIdRef.current);

    if (saved) ownedRequestIdRef.current = record.requestId;

    return saved;
  };
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

  // 완성 제출 뒤 제작 탭으로 나가기로 한 뒤에는 언마운트 전에 도착한 응답도 이탈 후
  // 도착으로 다룬다. 목·빠른 응답이 라우터 전환보다 먼저 오면 채팅 화면으로 끌려간다.
  const hasLeftForCreateRef = useRef(false);
  const [hasLeftForCreate, setHasLeftForCreate] = useState(false);
  const isFunnelActive = () =>
    isMountedRef.current &&
    !hasLeftForCreateRef.current &&
    getCreationEpoch() === epoch;

  const canGenerate = async (kind: TrialKind | null) => {
    if (
      awaitingAccess.current ||
      storageBusy.current ||
      !draft.isEntryResolved ||
      getCreationEpoch() !== epoch
    )
      return false;

    awaitingAccess.current = true;

    try {
      if (!(await requestConsent()) || !isFunnelActive()) return false;

      if (
        kind !== null &&
        sessionStatus === 'unauthenticated' &&
        getTrialRemaining(trials, kind) === 0
      ) {
        setGuestLimitOpen(true);

        return false;
      }

      return true;
    } finally {
      awaitingAccess.current = false;
    }
  };

  const simpleStoryTags = useGetSimpleStoryTags();

  const shouldConfirmBack = step !== 'keyword';

  const { leaveAfterCleanup } = usePreventPageLeave({
    warnOnUnload: shouldConfirmBack,
    interceptBack: true,
    ignoreBack: guestConsentOpen,
    onBackAttempt: () => handleBackAttempt(),
  });

  // 진입 이력과 관계없이 퍼널 이탈은 제작 탭으로 정착시킨다.
  const exitToCreate = () =>
    leaveAfterCleanup(() => router.replace(APP_PATH.MAIN.STUDIO));

  const failToAdditionalInfo = (stage: 'story' | 'chat') => {
    track('client_storyCreate_completeError_shown', { stage });
    setStep('additional-info');
    setHasCompleteStoryError(true);
  };

  // 완성 402 처리: 회원 이프 부족이면 토스트를 띄운다. 사유는 응답 바디 code로 구분하고
  // (백엔드 KNK-524), 퍼널의 기존 에러 복귀(failToAdditionalInfo)는 호출부에서 그대로 수행된다.
  const showCreditShortageIfNeeded = (error: unknown) => {
    if (
      resolvePaymentRequiredReason(error, sessionStatus) === 'guest-trial-limit'
    ) {
      setGuestLimitOpen(true);

      return;
    }

    if (
      resolvePaymentRequiredReason(error, sessionStatus) ===
      'insufficient-credit'
    ) {
      showCreditShortageToast('story_create');
    }
  };

  const resetAdditionalInfoStep = () => {
    resetAdditionalInfos();
    setSelectedRecommendations(new Set());
  };

  const generateStorylines = useGenerateSimpleStorylines({
    mutation: {
      onSuccess: async (response, variables) => {
        if (getCreationEpoch() !== epoch) return;

        // 이탈 후 도착한 응답은 레코드를 남겨 제작 탭 배너를 유지하고,
        // 재진입 시 복구 조회가 결과를 되찾게 한다(성공 부수효과도 그쪽에서 수행).
        if (resolveSuccessSettlement(isMountedRef.current) !== 'apply') {
          return;
        }

        if (response.status !== 201) {
          return;
        }

        const draftRecord = buildStorylineDraftRecord(
          variables.data.requestId,
          variables.data,
          response.data,
        );

        // 복구 조회가 결과를 선점 반영했으면 이중 적용을 건너뛴다. 성공 결과는
        // 즉시 draft로 승격해 다음 편집 자동 저장의 기준점으로 남긴다.
        if (
          !(await persistOwnRecord(draftRecord, (record) =>
            replacePendingCreationRequest(
              variables.data.requestId,
              record,
              epoch,
            ),
          ))
        ) {
          return;
        }

        if (!isFunnelActive()) return;

        setSettledGenerationRequestId(variables.data.requestId);
        draftAutosave.markCurrentAsSaved(true);
        applyStorylinesGeneratedEffects(queryClient);

        setGenerationRequest(variables.data);
        setGenerationResult(response.data);
        setActiveStorylineIndex(0);
        setSelectedStoryline(null);
        setStep('storyline-select');
      },
      onError: async (error, variables) => {
        if (getCreationEpoch() !== epoch) return;

        // 이탈 후 도착한 오류는 화면에 알릴 수 없으니 레코드를 남겨
        // 재진입 복구 조회가 실패·완료를 판정하게 한다. 마운트 상태에서는
        // 서버가 응답한 실패는 레코드를 지우고, 네트워크 오류는 보존한다.
        const settlement = resolveErrorSettlement(isMountedRef.current, error);

        if (settlement === 'defer-to-recovery') {
          return;
        }

        // 스토리라인 레코드는 초안으로 강등할 대상이 아니므로 재진입 복구에 맡긴다.
        if (settlement === 'downgrade-to-draft') {
          return;
        }

        // 실패 재시도에 재사용한 requestId가 서버의 기존 PENDING과 겹친 409는
        // 실패가 아니라 진행 중 신호다. 레코드를 유지해 복구 폴링으로 합류한다.
        if (
          error instanceof FetchError &&
          error.status === 409 &&
          reusedGenerationRequestIdRef.current === variables.data.requestId &&
          (await findPendingCreationRequest(variables.data.requestId)) !== null
        ) {
          draftAutosave.setPersistedStatus(true);

          return;
        }

        if (settlement === 'discard-record') {
          await takePendingCreationRequest(variables.data.requestId, epoch);
          ownedRequestIdRef.current = null;
          setHasRecoveredGenerateError(true);
          draftAutosave.setPersistedStatus(false);
        } else {
          draftAutosave.setPersistedStatus(true);
        }

        showCreditShortageIfNeeded(error);
      },
    },
  });
  const createChat = useCreateChat({
    mutation: {
      onSuccess: async (response) => {
        // 이탈 후 도착한 응답에 홈에서 강제 이동·토스트가 실행되지 않게 한다.
        if (!isFunnelActive()) {
          return;
        }

        const chatId = response.status === 201 ? response.data.id : undefined;

        if (!chatId) {
          failToAdditionalInfo('chat');

          return;
        }

        // 구버전에서 완성까지 저장한 초안의 채팅 재시도가 성공하면 기록을 정리한다.
        if (ownedRequestIdRef.current !== null) {
          await takePendingCreationRequest(ownedRequestIdRef.current, epoch);
          ownedRequestIdRef.current = null;
        }

        if (lastCompletionRequest !== null) {
          await takeStoryCompletionRequest(
            lastCompletionRequest.requestId,
            epoch,
          );
        }

        // 회원 서재는 서버가 정본 — 게스트로 확정됐을 때만 로컬에 ID를 남긴다.
        if (sessionStatus === 'unauthenticated') {
          saveCreatedChatId(chatId);
        } else {
          void queryClient.invalidateQueries({
            queryKey: getGetMyChatsQueryKey(),
          });
        }

        await queryClient.prefetchQuery(getGetChatDetailQueryOptions(chatId));
        toast.success(TOAST_MESSAGE.STORY_COMPLETED);
        leaveAfterCleanup(() => router.replace(APP_PATH.CHAT_ROOM(chatId)));
      },
      onError: () => {
        if (!isFunnelActive()) {
          return;
        }

        // 채팅 생성은 이프를 소모하지 않으므로 사유 구분 없이 완성 실패로 되돌린다.
        failToAdditionalInfo('chat');
      },
    },
  });

  const createStory = useCreateSimpleStory({
    mutation: {
      onError: async (error, variables) => {
        if (getCreationEpoch() !== epoch) return;

        // 이탈 후 도착한 오류는 레코드를 남겨 재진입 복구 조회에 맡긴다.
        const settlement = resolveErrorSettlement(isFunnelActive(), error);

        if (settlement === 'defer-to-recovery') {
          return;
        }

        // 제작 탭으로 돌아간 뒤 확정된 실패는 카드를 초안으로 되돌리고 토스트로만 알린다.
        if (settlement === 'downgrade-to-draft') {
          if (
            !(await demotePendingCompletionToDraft(
              variables.data.requestId,
              epoch,
            ))
          )
            return;

          if (
            resolvePaymentRequiredReason(error, sessionStatus) ===
            'insufficient-credit'
          ) {
            showCreditShortageToast('story_create');
          } else if (
            resolvePaymentRequiredReason(error, sessionStatus) ===
            'guest-trial-limit'
          ) {
            toast.error(TOAST_MESSAGE.GUEST_TRIAL_LIMIT);
          } else {
            toast.error(TOAST_MESSAGE.STORY_COMPLETE_FAILED);
          }

          return;
        }
      },
    },
  });

  const recovery = useCreationRequestRecovery({
    requestId: generationRequest?.requestId ?? null,
    epoch,
    // 원 생성 요청이 진행 중이면 원 응답을 우선하고, 끝난 뒤에도 레코드가 남아
    // 있을 때(재진입·응답 유실)만 복구 조회를 시작한다.
    suspended:
      hasLeftForCreate ||
      generateStorylines.isPending ||
      (generationRequest !== null &&
        settledGenerationRequestId === generationRequest.requestId) ||
      hasRecoveredGenerateError ||
      createStory.isPending ||
      createChat.isPending ||
      createdStoryId !== null,
    onRestorePending: (record) => {
      ownedRequestIdRef.current = record.requestId;
      draftAutosave.setPersistedStatus(true);

      // 네트워크 오류로 남은 뮤테이션 오류 상태가 복구 로딩과 겹쳐 보이지 않게 지운다.
      if (generateStorylines.isError) {
        generateStorylines.reset();
      }

      setGenerationRequest(record.generationRequest);
      setHasRecoveredGenerateError(false);
      setStep('storyline-select');
    },
    onStorylinesCompleted: (record, result) => {
      if (generateStorylines.isError) {
        generateStorylines.reset();
      }

      draftAutosave.markCurrentAsSaved(true);
      applyStorylinesGeneratedEffects(queryClient);

      setGenerationRequest(record.generationRequest);
      setGenerationResult(result);
      setActiveStorylineIndex(0);
      setSelectedStoryline(null);
      setHasRecoveredGenerateError(false);
      setStep('storyline-select');
    },
    onFailed: (record) => {
      setGenerationRequest(record.generationRequest);
      setHasRecoveredGenerateError(true);
      setStep('storyline-select');
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
    generateStorylines.isPending || recovery.isRecovering || isPersisting;
  const tagStep = useStoryTagStep({
    isGeneratingStorylines,
    onGenerateStorylines: handleGenerateStorylines,
  });

  // 임시 저장 복원: 키워드는 입력만 복원하고 첫 탭에서 시작한다. 스토리 draft는
  // 퍼널 컨텍스트를 통째로 되살려 완성·채팅 재시도 멱등 흐름에 합류시킨다.
  const restoreDraft = (record: DraftCreationRecord) => {
    ownedRequestIdRef.current = record.requestId;
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
    setLastCompletionRequest(record.completionRequest);
    setHasCompleteStoryError(false);
    setHasRecoveredGenerateError(false);
    setStep(record.step);
    draftAutosave.markCurrentAsSaved(true);
  };

  // 진행 카드에서 생성 중 레코드로 재개한 경우: 로딩 화면만 복원하고 조회는 복구 훅이 잇는다.
  const restorePendingGeneration = (record: StorylineGenerationRecord) => {
    ownedRequestIdRef.current = record.requestId;
    draftAutosave.setPersistedStatus(true);
    setGenerationRequest(record.generationRequest);
    setHasRecoveredGenerateError(false);
    setStep('storyline-select');
  };

  const draft = useStoryCreateDraft({
    onRestore: restoreDraft,
    onRestorePending: restorePendingGeneration,
  });

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
    currentEpoch === epoch &&
    !isPersisting &&
    !hasLeftForCreate &&
    !generateStorylines.isPending &&
    !createStory.isPending &&
    !createChat.isPending &&
    createdStoryId === null &&
    !recovery.isRecovering &&
    step !== 'complete';

  const persistDraftCandidate = async (record: DraftCreationRecord | null) => {
    if (record !== null) {
      const saved = await persistOwnRecord(record, saveDraftCreationRecord);

      if (saved) {
        track('client_storyCreate_draftSaved', {
          step: record.stage === 'KEYWORD_DRAFT' ? 'keyword' : record.step,
        });
      }

      return saved;
    }

    // 키워드 입력을 모두 지우면 소유한 키워드 초안을 제거한다.
    if (
      (await findPendingCreationRequest(keywordDraftRequestId))?.stage ===
      'KEYWORD_DRAFT'
    ) {
      if (!(await takePendingCreationRequest(keywordDraftRequestId, epoch)))
        return false;

      if (ownedRequestIdRef.current === keywordDraftRequestId) {
        ownedRequestIdRef.current = null;
      }
    }

    return true;
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
  const requestGenerateStorylines = async (
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
    storageBusy.current = true;
    setIsPersisting(true);
    await draftAutosave.settle();

    const saved = await persistOwnRecord(
      {
        stage: 'STORYLINE_GENERATION',
        requestId: request.requestId,
        generationRequest: request,
      },
      savePendingCreationRequest,
    );

    storageBusy.current = false;
    setIsPersisting(false);
    draftAutosave.setPersistedStatus(saved);

    if (!saved || !isFunnelActive()) {
      if (isFunnelActive()) toast.error(TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED);

      return;
    }

    if (parentCreationId === null) {
      setGenerationResult(null);
      setActiveStorylineIndex(0);
      setSelectedStoryline(null);
      setCreatedStoryId(null);
      setLastCompletionRequest(null);
      resetAdditionalInfoStep();
    }

    setStep('storyline-select');
    setSettledGenerationRequestId(null);
    setGenerationRequest(request);
    setHasRecoveredGenerateError(false);
    generateStorylines.mutate({ data: request });
  };

  async function handleGenerateStorylines(
    request: Omit<GenerateSimpleStorylinesRequest, 'requestId'>,
  ) {
    if (!(await canGenerate('storylineGeneration'))) return;

    track('client_storyCreate_storyGeneration_requested');
    await requestGenerateStorylines(request);
  }

  const handleRegenerateStorylines = async () => {
    if (!generationRequest) {
      return;
    }

    if (!(await canGenerate('storylineGeneration'))) return;

    if (typeof simpleCreationId === 'number') {
      track('client_storyCreate_regenerateButton_clicked', {
        creation_id: String(simpleCreationId),
      });
    }

    const isFailureRetry =
      generateStorylines.isError || hasRecoveredGenerateError;

    await requestGenerateStorylines(
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

  const handleCompleteStory = async () => {
    if (!(await canGenerate(createdStoryId === null ? 'storyCreation' : null)))
      return;

    setHasCompleteStoryError(false);

    if (createdStoryId !== null) {
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

    track('client_storyCreate_storyCompletion_requested', {
      creation_id: String(simpleCreationId),
    });

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

    // 실패 시 초안 복원에 필요한 퍼널 컨텍스트가 온전할 때만 완성 레코드를 저장한다.
    // (완료 조건상 이 시점에 항상 존재하지만 타입 좁히기를 겸한다.) 저장 성공 시
    // 편집 슬롯이 함께 비워져 다음 제작을 바로 시작할 수 있다.
    let saved = false;

    if (generationRequest !== null && generationResult !== null) {
      storageBusy.current = true;
      setIsPersisting(true);
      await draftAutosave.settle();

      saved = await addStoryCompletionRequest(
        {
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
        },
        epoch,
      );
      storageBusy.current = false;
      setIsPersisting(false);

      draftAutosave.setPersistedStatus(saved);

      if (saved) {
        ownedRequestIdRef.current = null;
      }
    }

    if (!saved || !isFunnelActive()) {
      if (isFunnelActive()) toast.error(TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED);

      return;
    }

    hasLeftForCreateRef.current = true;
    createStory.mutate({ data: request });

    // 저장한 완성 요청의 결과는 제작 탭 진행 카드가 되찾는다.
    setHasLeftForCreate(true);
    exitToCreate();
  };

  /** 명시적 이탈은 최신 입력의 저장 완료를 기다린다. */
  const flushAndExit = async () => {
    if (storageBusy.current) return;

    storageBusy.current = true;

    try {
      const saved = isDraftAutosaveEnabled
        ? await draftAutosave.flushCurrent()
        : true;

      if (!saved) {
        toast.error(TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED);

        return;
      }

      exitToCreate();
    } finally {
      storageBusy.current = false;
    }
  };

  // X·브라우저 뒤로가기 이탈 시도: 이탈은 늘 확인을 거친다(Android 패리티). 보존되는
  // 내용(자동 저장본·진행 중 요청·생성 결과)이 있으면 이어서 만들 수 있다는 확인을,
  // 저장할 수 없으면 소실 경고를 띄운다. 키워드 단계에서 입력이 비어 있으면 잃을 것이
  // 없으므로 묻지 않고 조용히 나간다.
  const handleBackAttempt = async () => {
    if (step === 'keyword') {
      if (!tagStep.hasKeywordInput) {
        track('client_storyCreate_exitButton_clicked', mapStepToSpec(step));
        flushAndExit();

        return;
      }

      setBackDialog('saved');

      return;
    }

    try {
      const hasPreservedContent =
        generationResult !== null ||
        (generationRequest !== null &&
          (await findPendingCreationRequest(generationRequest.requestId))
            ?.stage === 'STORYLINE_GENERATION');

      setBackDialog(hasPreservedContent ? 'saved' : 'lost');
    } catch {
      toast.error(TOAST_MESSAGE.STORY_DRAFT_LOAD_FAILED);
    }
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

  return {
    guestLimitOpen,
    setGuestLimitOpen,
    isEntryResolved: draft.isEntryResolved && epoch >= 0,
    entryError: draft.isError || (epoch >= 0 && currentEpoch !== epoch),
    retryEntry: draft.retry,
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
      isPersisting || createStory.isPending || createChat.isPending,
    hasCompleteStoryError,
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
    handleHeaderBack,
    handleConfirmBack,
  };
}
