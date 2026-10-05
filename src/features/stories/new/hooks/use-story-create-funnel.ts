'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

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
import { DRAFT_SAVE_TOAST_ID } from '@/features/stories/_shared/components/draft-save-button';
import type { DraftExitDialog } from '@/features/stories/_shared/constants/draft-exit-warning';
import { useCreationEpoch } from '@/features/stories/_shared/hooks/use-creation-epoch';
import { useGenreCatalog } from '@/features/stories/_shared/hooks/use-genre-catalog';
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
import { getDraftExitWarning } from '@/features/stories/_shared/utils/draft-exit-warning';
import { usePreventPageLeave } from '@/hooks/use-prevent-page-leave';
import { useSaveWhenBackgrounded } from '@/hooks/use-save-when-backgrounded';
import { useTrials } from '@/hooks/use-trials';
import { createClientId } from '@/lib/create-client-id';
import { FetchError } from '@/lib/custom-fetch';
import { track } from '@/observability/analytics';

import type { StoryCreateStep } from '../types';
import { mapStepToSpec } from '../utils/step-analytics';
import { getSelectedKeywordGroups } from '../utils/tag-categories';
import { useAdditionalInfos } from './use-additional-infos';
import { useCreationRequestRecovery } from './use-creation-request-recovery';
import { useStoryCreateDraft } from './use-story-create-draft';
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
  const [backDialog, setBackDialog] = useState<DraftExitDialog | null>(null);
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
  // 갖는다. 단계 전환(키워드 초안→생성 요청, 재생성, 복원 뒤 임시 저장)으로 requestId가
  // 바뀔 때 이전 레코드를 지워, 단일 슬롯이 덮어쓰기로 해 주던 정리를 명시적으로 대신한다.
  const ownedRequestIdRef = useRef<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  // 이 세션이 마지막으로 저장소에 남긴 편집 상태의 키. null이면 남긴 레코드가 없다.
  const [savedDraftKey, setSavedDraftKey] = useState<string | null>(null);
  // 복원·생성 요청·생성 결과처럼 저장소에 쓴 레코드로 상태를 바꾸면 다음 렌더의 편집 상태를
  // 저장본으로 삼는다. 상태 갱신이 한 렌더에 모이므로 그 렌더의 키가 레코드와 같은 내용이다.
  const [shouldSyncSavedDraft, setShouldSyncSavedDraft] = useState(false);
  // 진행 중인 편집 초안 쓰기. 생성·완성 레코드를 쓰기 전에 끝나기를 기다려 소유 레코드의
  // 교체가 늦게 끝난 초안 쓰기와 엇갈리지 않게 한다.
  const draftWriteRef = useRef<Promise<boolean> | null>(null);

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
  const genreCatalog = useGenreCatalog();

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
        // 즉시 draft로 승격해 다음 임시 저장의 기준점으로 남긴다.
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
        setShouldSyncSavedDraft(true);
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
          return;
        }

        if (settlement === 'discard-record') {
          await takePendingCreationRequest(variables.data.requestId, epoch);
          ownedRequestIdRef.current = null;
          setHasRecoveredGenerateError(true);
          setSavedDraftKey(null);
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
      setShouldSyncSavedDraft(true);

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

      setShouldSyncSavedDraft(true);
      applyStorylinesGeneratedEffects(queryClient);

      setGenerationRequest(record.generationRequest);
      setGenerationResult(result);
      setActiveStorylineIndex(0);
      setSelectedStoryline(null);
      setHasRecoveredGenerateError(false);
      setStep('storyline-select');
    },
    // 복구 조회는 실패한 레코드를 지운다.
    onFailed: (record) => {
      setSavedDraftKey(null);
      setGenerationRequest(record.generationRequest);
      setHasRecoveredGenerateError(true);
      setStep('storyline-select');
    },
  });

  const storylines = getGeneratedStorylines(generationResult);
  // 대표 밖 장르의 이름은 간편 제작 태그 목록에 없어 제공 장르 전체 목록에서 찾는다.
  const selectedTagGroups = getSelectedKeywordGroups(generationRequest, [
    ...(simpleStoryTags.data?.data ?? []),
    ...(genreCatalog.catalog?.genres ?? []),
  ]);
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
      setShouldSyncSavedDraft(true);

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
    setShouldSyncSavedDraft(true);
  };

  // 진행 카드에서 생성 중 레코드로 재개한 경우: 로딩 화면만 복원하고 조회는 복구 훅이 잇는다.
  const restorePendingGeneration = (record: StorylineGenerationRecord) => {
    ownedRequestIdRef.current = record.requestId;
    setShouldSyncSavedDraft(true);
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
  const draftKey = JSON.stringify(draftCandidate);

  if (shouldSyncSavedDraft) {
    setShouldSyncSavedDraft(false);
    setSavedDraftKey(draftKey);
  }

  const hasDraftInput = draftCandidate !== null;
  const hasSavedDraft = savedDraftKey !== null;
  const isDraftSaved = draftKey === savedDraftKey;
  const canSaveDraft =
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

  const writeDraft = async () => {
    if (draftCandidate === null) return false;

    const record = draftCandidate;
    const key = draftKey;
    const write = persistOwnRecord(record, saveDraftCreationRecord);

    draftWriteRef.current = write;
    setIsSavingDraft(true);

    const saved = await write;

    setIsSavingDraft(false);

    if (saved) {
      setSavedDraftKey(key);
      track('client_storyCreate_draftSaved', {
        step: record.stage === 'KEYWORD_DRAFT' ? 'keyword' : record.step,
      });
    } else {
      toast.error(TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED, {
        id: DRAFT_SAVE_TOAST_ID,
      });
    }

    return saved;
  };

  // 버튼 없이 저장하는 단계 이동·화면 숨김은 입력이 없거나 마지막 저장본과 같으면 건너뛴다.
  const saveDraft = async () => {
    if (canSaveDraft && hasDraftInput && !isDraftSaved && !isSavingDraft)
      await writeDraft();
  };

  useSaveWhenBackgrounded(saveDraft);

  // 단계를 옮기면 옮겨 간 단계의 편집 상태를 알리지 않고 저장한다(일반 제작의 탭 이동 저장에 대응).
  // 키워드 카테고리 탭 이동은 단계 이동이 아니라 저장하지 않는다.
  const saveDraftOnStepChange = useEffectEvent(() => {
    void saveDraft();
  });

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (active) saveDraftOnStepChange();
    });

    return () => {
      active = false;
    };
  }, [step]);

  const { leaveAfterCleanup } = usePreventPageLeave({
    warnOnUnload: hasSavedDraft ? !isDraftSaved : hasDraftInput,
    interceptBack: true,
    ignoreBack: guestConsentOpen,
    onBackAttempt: () => handleBackAttempt(),
  });

  // 진입 이력과 관계없이 퍼널 이탈은 제작 탭으로 정착시킨다.
  const exitToCreate = () =>
    leaveAfterCleanup(() => router.replace(APP_PATH.MAIN.STUDIO));

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
    // 직접 입력 장르는 서버가 새 requestId에서 받지 않아, 같은 요청을 다시 보낼 때만 남긴다.
    const { customGenreTags, ...rest } = input;
    const request: GenerateSimpleStorylinesRequest = {
      ...rest,
      ...(reusedRequestId !== null && customGenreTags && { customGenreTags }),
      requestId: reusedRequestId ?? createClientId(),
      parentCreationId:
        reusedRequestId === null
          ? parentCreationId
          : (input.parentCreationId ?? null),
    };

    reusedGenerationRequestIdRef.current = reusedRequestId;
    storageBusy.current = true;
    setIsPersisting(true);
    await draftWriteRef.current;

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

    if (saved) setShouldSyncSavedDraft(true);

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
      await draftWriteRef.current;

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

  // 저장하지 않고 나간다. 생성 요청 레코드를 쓰는 중에는 요청을 보내기 전이라 나가지 않는다.
  const leaveFunnel = () => {
    track('client_storyCreate_exitButton_clicked', mapStepToSpec(step));

    if (storageBusy.current) return;

    exitToCreate();
  };

  // X·브라우저 뒤로가기 이탈 시도: 일반 제작과 같은 기준으로 확인 다이얼로그를 고르고, 잃을 것이
  // 없으면 묻지 않고 나간다. 생성 중 레코드는 생성 요청을 저장한 시점에 저장본으로 맞춰 두었으므로
  // 생성 중에 나가면 이어서 만들 수 있다는 안내다.
  const handleBackAttempt = () => {
    const warning = getDraftExitWarning({
      hasInput: hasDraftInput,
      hasSavedDraft,
      isSaved: isDraftSaved,
    });

    if (warning === 'nothing') {
      leaveFunnel();

      return;
    }

    setBackDialog(warning);
  };

  const handleHeaderBack = () => handleBackAttempt();

  const handleConfirmBack = () => {
    setBackDialog(null);
    leaveFunnel();
  };

  return {
    guestLimitOpen,
    setGuestLimitOpen,
    isEntryResolved: draft.isEntryResolved && epoch >= 0,
    entryError: draft.isError || (epoch >= 0 && currentEpoch !== epoch),
    retryEntry: draft.retry,
    step,
    tagStep,
    isSavingDraft,
    canSaveDraft: canSaveDraft && hasDraftInput,
    isDraftSaved,
    saveDraft: writeDraft,
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
