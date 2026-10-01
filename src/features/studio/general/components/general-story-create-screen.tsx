'use client';

import { useEffect, useRef, useState } from 'react';

import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useGetSimpleStoryTags } from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import { useCreateGeneralStory } from '@/api/generated/endpoints/stories/stories';
import {
  get as getStorySubmission,
  getListQueryKey as getStorySubmissionsQueryKey,
  useResubmit,
} from '@/api/generated/endpoints/story-submission-controller/story-submission-controller';
import { getGetMyStoriesQueryKey } from '@/api/generated/endpoints/users/users';
import type { CreateGeneralStoryRequestVisibility } from '@/api/generated/models';
import { CollapsedListItemsProvider } from '@/components/common/collapsible-list-item';
import { RetryListStatus } from '@/components/common/retry-list-status';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  DRAFT_SAVE_TOAST_ID,
  DRAFT_SAVED_TOAST_DURATION_MS,
  DraftSaveButton,
} from '@/features/stories/_shared/components/draft-save-button';
import {
  DRAFT_EXIT_WARNING_COPY,
  type DraftExitDialog,
} from '@/features/stories/_shared/constants/draft-exit-warning';
import { useCreationEpoch } from '@/features/stories/_shared/hooks/use-creation-epoch';
import { useStartChat } from '@/features/stories/_shared/hooks/use-start-chat';
import {
  savePendingCreationRequest,
  takePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { getDraftExitWarning } from '@/features/stories/_shared/utils/draft-exit-warning';
import {
  type GeneralStoryDraftImage,
  type GeneralStoryDraftSnapshot,
  hasGeneralStoryDraftInput,
} from '@/features/studio/_shared/utils/general-story-draft';
import {
  readStorySubmission,
  type StorySubmission,
} from '@/features/studio/_shared/utils/story-submission';
import {
  GENERAL_STORY_CHARACTER_COPY,
  GENERAL_STORY_CREATE_COPY,
  GENERAL_STORY_TEXT_FIELDS,
  type GeneralStoryTextField,
} from '@/features/studio/general/constants';
import type { DraftImage } from '@/features/studio/general/hooks/use-draft-image-picker';
import { useGeneralStoryDraftEntry } from '@/features/studio/general/hooks/use-general-story-draft-entry';
import {
  buildGeneralStoryRequest,
  resolveGenreNames,
} from '@/features/studio/general/utils/build-general-story-request';
import type { GeneralStoryCharacter } from '@/features/studio/general/utils/character-settings';
import { EMPTY_GENRE_SELECTION } from '@/features/studio/general/utils/genre-selection';
import type { GeneralStoryMainEventDraft } from '@/features/studio/general/utils/main-event-draft';
import {
  getRegisterErrors,
  REGISTER_ERROR_KEY,
} from '@/features/studio/general/utils/register-validation';
import {
  type GeneralStoryReviewForm,
  getReviewErrors,
} from '@/features/studio/general/utils/review-issues';
import {
  createStartSettingDraft,
  type GeneralStoryStartSettingDraft,
} from '@/features/studio/general/utils/start-setting-draft';
import { LENGTH_RATIO_DEFAULT } from '@/features/studio/general/utils/story-setting-sections';
import type { GeneralStoryFormInitial } from '@/features/studio/general/utils/submission-form';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { usePreventPageLeave } from '@/hooks/use-prevent-page-leave';
import { useSaveWhenBackgrounded } from '@/hooks/use-save-when-backgrounded';
import { FetchError, getApiErrorCode } from '@/lib/api-error';
import { track } from '@/observability/analytics';

import { GeneralStoryCharacterFields } from './general-story-character-fields';
import {
  GeneralStoryFormTabs,
  type GeneralStoryFormTabsHandle,
  type GeneralStoryTextValues,
} from './general-story-form-tabs';
import { GeneralStoryMainEventPanel } from './general-story-main-event-panel';
import { GeneralStoryRegisterErrorsContext } from './general-story-register-errors';
import { GeneralStoryRegisterPanel } from './general-story-register-panel';
import { GeneralStoryReviewNotice } from './general-story-review-notice';
import { GeneralStoryStartSettingPanel } from './general-story-start-setting-panel';
import {
  type GeneralStorySupportingCharacter,
  GeneralStorySupportingCharacterList,
} from './general-story-supporting-character-list';

const EMPTY_TEXT_VALUES = Object.fromEntries(
  Object.keys(GENERAL_STORY_TEXT_FIELDS).map((field) => [field, '']),
) as GeneralStoryTextValues;

/** 검토 중 토스트의 id다. 결과를 알리거나 화면을 떠날 때 아직 떠 있으면 이 id로 닫는다. */
const REVIEW_TOAST_ID = 'general-story-review';

/** 검수 결과를 다시 조회하는 간격이다. 서버 검수 폴러의 간격과 같다. */
const REVIEW_POLL_INTERVAL_MS = 1000;

/**
 * 검수 결과를 기다리는 상한이다. 정상 검수는 몇 초 안에 끝나고, 이보다 길면 서버가 일시 실패를
 * 1분·5분 뒤 재시도하는 경우라 화면에서 기다리지 않는다.
 */
const REVIEW_WAIT_MS = 60_000;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * 임시 저장본의 이미지로 폼 이미지를 만든다. 미리보기 blob URL은 저장한 파일로 다시 만든다.
 *
 * @param image 임시 저장한 이미지
 * @returns 폼에서 쓰는 이미지. 없으면 null
 */
const toDraftImage = (
  image: GeneralStoryDraftImage | null,
): DraftImage | null =>
  image && {
    ...image,
    previewUrl: image.blob ? URL.createObjectURL(image.blob) : '',
  };

/**
 * 폼 이미지를 임시 저장할 형태로 바꾼다. 페이지마다 달라지는 blob URL은 빼고 저장한다.
 *
 * @param image 폼에서 쓰는 이미지
 * @returns 임시 저장할 이미지. 없으면 null
 */
const toStoredImage = (
  image: DraftImage | null,
): GeneralStoryDraftImage | null =>
  image && { objectKey: image.objectKey, blob: image.blob };

export function GeneralStoryCreateScreen() {
  const { entry, isError, retry } = useGeneralStoryDraftEntry();
  const showSkeleton = useDelayedLoading(!entry && !isError);

  if (entry) {
    const { record } = entry;

    return (
      <GeneralStoryCreateForm
        initial={
          record && {
            ...record.snapshot,
            cover: toDraftImage(record.snapshot.cover),
            supporting: record.snapshot.supporting.map((character) => ({
              ...character,
              image: toDraftImage(character.image),
            })),
          }
        }
        draftRequestId={record?.requestId}
      />
    );
  }

  if (isError) {
    return (
      <RetryListStatus
        title={TOAST_MESSAGE.STORY_DRAFT_LOAD_FAILED}
        onRetry={retry}
      />
    );
  }

  return showSkeleton ? <Skeleton className="m-4 h-48" /> : null;
}

type GeneralStoryCreateFormProps = {
  /** 폼 초기 입력. 없으면 빈 폼으로 새로 만든다. */
  initial: GeneralStoryFormInitial | null;
  /** 이어서 만드는 임시 저장본의 id다. 있으면 같은 레코드에 덮어쓴다. */
  draftRequestId?: string;
  /** 고쳐 다시 제출할 반려·실패 제출본이다. 있으면 처음부터 접수된 상태로 연다. */
  submission?: StorySubmission;
};

export function GeneralStoryCreateForm({
  initial,
  draftRequestId,
  submission,
}: GeneralStoryCreateFormProps) {
  const router = useRouter();
  const epoch = useCreationEpoch();
  const tabsRef = useRef<GeneralStoryFormTabsHandle>(null);
  const [requestId] = useState(() => draftRequestId ?? crypto.randomUUID());
  const [exitWarning, setExitWarning] = useState<DraftExitDialog>('saved');
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [textValues, setTextValues] = useState(
    initial?.texts ?? EMPTY_TEXT_VALUES,
  );
  const [cover, setCover] = useState(initial?.cover ?? null);
  const [descriptionRatio, setDescriptionRatio] = useState(
    initial?.descriptionRatio ?? LENGTH_RATIO_DEFAULT,
  );
  const [protagonist, setProtagonist] = useState<GeneralStoryCharacter>(
    initial?.protagonist ?? { name: '', gender: null, feature: '' },
  );
  const [supporting, setSupporting] = useState<
    GeneralStorySupportingCharacter[]
  >(() =>
    initial
      ? initial.supporting
      : [
          {
            id: crypto.randomUUID(),
            name: '',
            gender: null,
            feature: '',
            image: null,
          },
        ],
  );
  const [startSettings, setStartSettings] = useState<
    GeneralStoryStartSettingDraft[]
  >(() => initial?.startSettings ?? [createStartSettingDraft()]);
  const [mainEvents, setMainEvents] = useState<GeneralStoryMainEventDraft[]>(
    initial?.mainEvents ?? [],
  );
  const [genres, setGenres] = useState(
    initial?.genres ?? EMPTY_GENRE_SELECTION,
  );
  const [storyDescription, setStoryDescription] = useState(
    initial?.description ?? '',
  );
  const [storyVisibility, setStoryVisibility] =
    useState<CreateGeneralStoryRequestVisibility>(
      initial?.visibility ?? 'PRIVATE',
    );
  const [hasTriedRegister, setHasTriedRegister] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  /** 검토 중이거나 승인돼 떠나는 중이면 참이다. 비동기 흐름과 저장 판단이 같은 값을 보도록 ref로 둔다. */
  const isReviewingRef = useRef(false);
  /** 화면을 떠나면 중단해 검토 결과 조회와 이후 이동을 멈춘다. */
  const reviewAbortRef = useRef<AbortController | null>(null);
  /** 반려·실패한 제출본 id다. 다시 등록하면 새로 제출하지 않고 이 제출본을 재제출한다. */
  const rejectedSubmissionIdRef = useRef(submission?.submissionId ?? null);
  const isSubmittedRef = useRef(Boolean(submission));
  const queryClient = useQueryClient();
  const tags = useGetSimpleStoryTags();
  const createGeneralStory = useCreateGeneralStory();
  const resubmitGeneralStory = useResubmit();
  const { startChatFor } = useStartChat('', {
    // 스토리는 이미 만들어졌으므로 채팅을 열지 못하면 상세로 보내 거기서 시작하게 한다.
    onError: (storyId) => router.replace(APP_PATH.STORY_DETAIL(storyId)),
  });

  useEffect(() => {
    track('client_generalCreate_viewed');

    // 검토 중에 화면을 떠나면 검토 중 토스트를 닫고 조회를 멈춘다.
    return () => {
      reviewAbortRef.current?.abort();
      toast.dismiss(REVIEW_TOAST_ID);
    };
  }, []);

  const snapshot: GeneralStoryDraftSnapshot = {
    texts: textValues,
    cover: toStoredImage(cover),
    descriptionRatio,
    protagonist,
    supporting: supporting.map((character) => ({
      ...character,
      image: toStoredImage(character.image),
    })),
    startSettings,
    mainEvents,
    genres,
    description: storyDescription,
    visibility: storyVisibility,
  };
  const snapshotKey = JSON.stringify(snapshot);
  const [savedKey, setSavedKey] = useState(() =>
    draftRequestId ? snapshotKey : null,
  );
  /**
   * 마지막으로 접수된 입력의 스냅숏 키다. 접수되면 입력의 정본이 서버 제출본이 되므로 임시 저장본을
   * 지우고 이 화면에서는 다시 임시 저장하지 않는다(이어서 만들기로 같은 입력을 새로 제출하지 않게).
   */
  const [submittedKey, setSubmittedKey] = useState(() =>
    submission ? snapshotKey : null,
  );
  const reviewForm: GeneralStoryReviewForm = {
    texts: textValues,
    cover,
    protagonist,
    supporting,
    startSettings,
    mainEvents,
    genres,
    description: storyDescription,
  };
  /** 통과하지 못한 검수 결과와 그때 제출한 폼이다. 다시 접수되면 비운다. */
  const [review, setReview] = useState(() =>
    submission ? { submission, form: reviewForm } : null,
  );
  const reviewErrors = review
    ? getReviewErrors(review.submission, reviewForm, review.form)
    : { fieldErrors: [], notices: [] };
  const registerErrors = getRegisterErrors({
    texts: textValues,
    protagonist,
    supporting,
    startSettings,
    mainEvents,
    genreCount: genres.selected.length,
    description: storyDescription,
  });

  const hasInput = hasGeneralStoryDraftInput(snapshot);
  const hasSavedDraft = savedKey !== null;
  const isSaved = snapshotKey === savedKey;

  const writeDraft = async () => {
    const key = snapshotKey;

    setIsSaving(true);

    const saved = await savePendingCreationRequest(
      { stage: 'GENERAL_DRAFT', requestId, snapshot },
      epoch,
    );

    setIsSaving(false);

    if (saved) {
      setSavedKey(key);
    } else {
      toast.error(TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED, {
        id: DRAFT_SAVE_TOAST_ID,
      });
    }

    return saved;
  };

  // 검토 중이거나 접수된 뒤에는 저장하지 않는다. 지운 임시 저장본을 화면 숨김 저장이 되살리지 않게 한다.
  const saveDraft = async () => {
    if (
      hasInput &&
      !isSaved &&
      !isSaving &&
      !isReviewingRef.current &&
      !isSubmittedRef.current
    )
      await writeDraft();
  };

  useSaveWhenBackgrounded(saveDraft);

  const leaveToStudio = () =>
    leaveAfterCleanup(() => router.replace(APP_PATH.MAIN.STUDIO));

  // 잃을 것이 없으면 묻지 않고 나간다.
  const handleClose = () => {
    const warning = getDraftExitWarning({
      hasInput,
      hasSavedDraft,
      isSaved,
      hasSubmitted: submittedKey !== null,
      isSubmittedUnchanged: snapshotKey === submittedKey,
    });

    if (warning === 'nothing') {
      leaveToStudio();

      return;
    }

    setExitWarning(warning);
    setIsExitOpen(true);
  };

  const { leaveAfterCleanup } = usePreventPageLeave({
    warnOnUnload:
      submittedKey !== null
        ? snapshotKey !== submittedKey
        : hasSavedDraft
          ? !isSaved
          : hasInput,
    interceptBack: true,
    onBackAttempt: () => (isExitOpen ? setIsExitOpen(false) : handleClose()),
  });

  const finishReview = () => {
    isReviewingRef.current = false;
    setIsReviewing(false);
    toast.dismiss(REVIEW_TOAST_ID);
  };

  /**
   * 제출본의 검수 결과를 기다린다. 조회가 일시적으로 실패해도 상한까지 다시 조회한다.
   * 승인됐는데 스토리 id가 아직 없으면 끝나지 않은 것으로 보고 다시 조회한다.
   *
   * @returns 검수가 끝난 제출본. 상한까지 끝나지 않으면 null
   */
  const waitForReview = async (
    submissionId: string,
    signal: AbortSignal,
  ): Promise<StorySubmission | null> => {
    const deadline = Date.now() + REVIEW_WAIT_MS;

    while (Date.now() < deadline) {
      await wait(REVIEW_POLL_INTERVAL_MS);

      if (signal.aborted) break;

      try {
        const response = await getStorySubmission(submissionId, { signal });
        const result = readStorySubmission(response.data);

        if (
          result &&
          result.status !== 'PENDING' &&
          (result.status !== 'APPROVED' || result.storyId)
        )
          return result;
      } catch {
        // 일시적인 조회 실패는 다음 조회에서 다시 확인한다.
      }
    }

    return null;
  };

  const handleRegister = async () => {
    if (isReviewingRef.current) return;

    const genreNames = resolveGenreNames(
      genres,
      tags.data?.status === 200 ? tags.data.data : [],
    );

    // 제공 장르 목록을 아직 받지 못해 장르 이름을 만들 수 없으면 요청하지 않는다.
    if (!genreNames) {
      track('client_generalCreate_registerError_shown', { status: 0 });
      toast.error(TOAST_MESSAGE.STORY_REGISTER_FAILED);

      return;
    }

    const request = buildGeneralStoryRequest(
      {
        texts: textValues,
        coverObjectKey: cover?.objectKey ?? null,
        descriptionRatio,
        protagonist,
        supporting: supporting.map((character) => ({
          ...character,
          imageObjectKey: character.image?.objectKey ?? null,
        })),
        startSettings,
        mainEvents,
        genres,
        description: storyDescription,
        visibility: storyVisibility,
      },
      genreNames,
    );
    const requestKey = snapshotKey;
    const requestForm = reviewForm;
    const controller = new AbortController();

    reviewAbortRef.current = controller;
    isReviewingRef.current = true;
    setIsReviewing(true);
    // 위쪽 토스트가 헤더의 닫기를 오래 가리지 않게 짧게 띄우고, 검토가 이어지는 동안은 등록하기 스피너가 알린다.
    toast(TOAST_MESSAGE.STORY_REVIEWING, {
      id: REVIEW_TOAST_ID,
      duration: DRAFT_SAVED_TOAST_DURATION_MS,
      icon: <Spinner className="size-4" />,
    });

    let submissionId: string | undefined;

    try {
      const rejectedId = rejectedSubmissionIdRef.current;
      const response = rejectedId
        ? await resubmitGeneralStory.mutateAsync({
            id: rejectedId,
            data: request,
          })
        : await createGeneralStory.mutateAsync({ data: request });

      submissionId = response.data.submissionId;
    } catch (error) {
      if (controller.signal.aborted) return;

      const status = error instanceof FetchError ? error.status : 0;
      const errorCode = getApiErrorCode(error);

      // 재제출할 수 없는 제출본(이미 지웠거나 상태가 바뀜)이면 다음에는 새로 제출한다.
      if (status === 404 || status === 409)
        rejectedSubmissionIdRef.current = null;

      finishReview();
      track('client_generalCreate_registerError_shown', { status });
      toast.error(
        errorCode === 'IMAGES_TOO_LARGE'
          ? TOAST_MESSAGE.STORY_IMAGES_TOO_LARGE
          : errorCode === 'UPLOAD_NOT_FOUND'
            ? TOAST_MESSAGE.STORY_IMAGE_NOT_FOUND
            : TOAST_MESSAGE.STORY_REGISTER_FAILED,
      );

      return;
    }

    if (!submissionId) {
      if (controller.signal.aborted) return;

      finishReview();
      track('client_generalCreate_registerError_shown', { status: 0 });
      toast.error(TOAST_MESSAGE.STORY_REGISTER_FAILED);

      return;
    }

    // 접수된 입력은 서버 제출본에 남으므로 임시 저장본을 지운다. 지우지 못해도 흐름은 막지 않는다.
    isSubmittedRef.current = true;
    setSubmittedKey(requestKey);
    setSavedKey(null);
    setReview(null);
    void queryClient.invalidateQueries({
      queryKey: getStorySubmissionsQueryKey(),
    });
    await takePendingCreationRequest(requestId, epoch).catch(() => false);

    // 응답을 받은 뒤 화면을 떠났어도 위에서 임시 저장본은 지우고, 그 뒤 흐름만 멈춘다.
    if (controller.signal.aborted) return;

    track('client_generalCreate_completed', {
      submission_id: submissionId,
      start_setting_count: startSettings.length,
      ending_count: startSettings.reduce(
        (count, setting) => count + setting.endings.length,
        0,
      ),
      main_event_count: mainEvents.length,
      image_count:
        (cover ? 1 : 0) +
        supporting.filter((character) => character.image).length,
    });

    const result = await waitForReview(submissionId, controller.signal);

    if (controller.signal.aborted) return;

    const trackResult = (
      result: 'approved' | 'rejected' | 'failed' | 'timeout',
    ) =>
      track('client_generalCreate_reviewResult_shown', {
        submission_id: submissionId,
        result,
      });

    if (result?.status === 'REJECTED' || result?.status === 'FAILED') {
      rejectedSubmissionIdRef.current = submissionId;
      trackResult(result.status === 'REJECTED' ? 'rejected' : 'failed');
      finishReview();
      toast.error(TOAST_MESSAGE.STORY_REVIEW_REJECTED);
      // 제출한 폼 기준으로 칸별 사유를 붙이고, 첫 사유 칸으로 옮긴다.
      setReview({ submission: result, form: requestForm });
      tabsRef.current?.revealErrors(
        getReviewErrors(result, requestForm, requestForm).fieldErrors,
      );

      return;
    }

    // 검토 중 표시(버튼 잠금)는 떠날 때까지 둔다.
    toast.dismiss(REVIEW_TOAST_ID);
    void queryClient.invalidateQueries({
      queryKey: getStorySubmissionsQueryKey(),
    });

    if (result?.status === 'APPROVED' && result.storyId) {
      const { storyId } = result;

      trackResult('approved');
      void queryClient.invalidateQueries({
        queryKey: getGetMyStoriesQueryKey(),
      });
      leaveAfterCleanup(() => startChatFor(storyId));

      return;
    }

    trackResult('timeout');
    toast(TOAST_MESSAGE.STORY_REVIEW_DELAYED);
    leaveToStudio();
  };

  // 등록하기를 누른 뒤의 입력 오류와 검수 결과를 함께 보인다. 같은 칸이면 입력 오류가 먼저다.
  const shownErrors =
    hasTriedRegister || reviewErrors.fieldErrors.length > 0
      ? [
          ...(hasTriedRegister ? registerErrors : []),
          ...reviewErrors.fieldErrors.filter(
            ({ key }) =>
              !hasTriedRegister ||
              !registerErrors.some((error) => error.key === key),
          ),
        ]
      : null;
  const copy = DRAFT_EXIT_WARNING_COPY[exitWarning];

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-4">
        <h1 className="font-semibold">{GENERAL_STORY_CREATE_COPY.title}</h1>
        <div className="ml-auto flex items-center gap-1">
          <DraftSaveButton
            isSaving={isSaving}
            disabled={!hasInput || isReviewing || submittedKey !== null}
            isSaved={isSaved}
            onSave={writeDraft}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={GENERAL_STORY_CREATE_COPY.close}
            onClick={handleClose}>
            <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
          </Button>
        </div>
      </header>
      {review &&
        (review.submission.status === 'REJECTED' ||
          review.submission.status === 'FAILED') && (
          <GeneralStoryReviewNotice
            status={review.submission.status}
            hasImageError={
              review.submission.imageErrors.length > 0 ||
              Boolean(review.submission.errorCode?.startsWith('IMAGE_'))
            }
            notices={reviewErrors.notices}
          />
        )}
      <CollapsedListItemsProvider>
        <GeneralStoryRegisterErrorsContext value={shownErrors}>
          <GeneralStoryFormTabs
            ref={tabsRef}
            initialTab={reviewErrors.fieldErrors[0]?.tab}
            values={textValues}
            onChange={(field: GeneralStoryTextField, value: string) =>
              setTextValues((previous) => ({ ...previous, [field]: value }))
            }
            cover={cover}
            onCoverChange={setCover}
            descriptionRatio={descriptionRatio}
            onDescriptionRatioChange={setDescriptionRatio}
            panels={{
              protagonist: (
                <GeneralStoryCharacterFields
                  idPrefix="general-story-protagonist"
                  labelPrefix="주인공"
                  character={protagonist}
                  namePlaceholder={
                    GENERAL_STORY_CHARACTER_COPY.protagonistNamePlaceholder
                  }
                  featurePlaceholder={
                    GENERAL_STORY_CHARACTER_COPY.protagonistFeaturePlaceholder
                  }
                  basicInfoDescription={
                    GENERAL_STORY_CHARACTER_COPY.protagonistBasicInfoDescription
                  }
                  featureDescription={
                    GENERAL_STORY_CHARACTER_COPY.protagonistFeatureDescription
                  }
                  featureRequired
                  registerErrorKeys={{
                    name: REGISTER_ERROR_KEY.protagonist('name'),
                    gender: REGISTER_ERROR_KEY.protagonist('gender'),
                    feature: REGISTER_ERROR_KEY.protagonist('feature'),
                  }}
                  onChange={setProtagonist}
                />
              ),
              supporting: (
                <GeneralStorySupportingCharacterList
                  protagonistName={protagonist.name}
                  characters={supporting}
                  onChange={setSupporting}
                />
              ),
              start: (
                <GeneralStoryStartSettingPanel
                  startSettings={startSettings}
                  onChange={setStartSettings}
                />
              ),
              event: (
                <GeneralStoryMainEventPanel
                  mainEvents={mainEvents}
                  onChange={setMainEvents}
                />
              ),
              publish: (
                <GeneralStoryRegisterPanel
                  genres={genres}
                  onGenresChange={setGenres}
                  storyDescription={storyDescription}
                  onStoryDescriptionChange={setStoryDescription}
                  storyVisibility={storyVisibility}
                  onStoryVisibilityChange={setStoryVisibility}
                />
              ),
            }}
            registerErrors={registerErrors}
            onRegisterAttempt={() => setHasTriedRegister(true)}
            onRegister={handleRegister}
            isRegistering={isReviewing}
            onTabChange={saveDraft}
          />
        </GeneralStoryRegisterErrorsContext>
      </CollapsedListItemsProvider>
      <AlertDialog open={isExitOpen} onOpenChange={setIsExitOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={leaveToStudio}>
              {copy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
