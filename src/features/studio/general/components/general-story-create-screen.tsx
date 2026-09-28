'use client';

import { useRef, useState } from 'react';

import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
import { useCreationEpoch } from '@/features/stories/_shared/hooks/use-creation-epoch';
import {
  type GeneralDraftRecord,
  savePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  type GeneralStoryDraftImage,
  type GeneralStoryDraftSnapshot,
  hasGeneralStoryDraftInput,
} from '@/features/studio/_shared/utils/general-story-draft';
import {
  GENERAL_STORY_CHARACTER_COPY,
  GENERAL_STORY_CREATE_COPY,
  GENERAL_STORY_EXIT_WARNING_COPY,
  GENERAL_STORY_TEXT_FIELDS,
  type GeneralStoryExitWarning,
  type GeneralStoryTextField,
} from '@/features/studio/general/constants';
import type { DraftImage } from '@/features/studio/general/hooks/use-draft-image-picker';
import { useGeneralStoryDraftEntry } from '@/features/studio/general/hooks/use-general-story-draft-entry';
import type { GeneralStoryCharacter } from '@/features/studio/general/utils/character-settings';
import { getDraftExitWarning } from '@/features/studio/general/utils/draft-exit-warning';
import { EMPTY_GENRE_SELECTION } from '@/features/studio/general/utils/genre-selection';
import type { GeneralStoryMainEventDraft } from '@/features/studio/general/utils/main-event-draft';
import {
  getRegisterErrors,
  REGISTER_ERROR_KEY,
} from '@/features/studio/general/utils/register-validation';
import {
  createStartSettingDraft,
  type GeneralStoryStartSettingDraft,
} from '@/features/studio/general/utils/start-setting-draft';
import { LENGTH_RATIO_DEFAULT } from '@/features/studio/general/utils/story-setting-sections';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { usePreventPageLeave } from '@/hooks/use-prevent-page-leave';
import { cn } from '@/lib/utils';

import { GeneralStoryCharacterFields } from './general-story-character-fields';
import {
  GeneralStoryFormTabs,
  type GeneralStoryTextValues,
} from './general-story-form-tabs';
import { GeneralStoryMainEventPanel } from './general-story-main-event-panel';
import { GeneralStoryRegisterErrorsContext } from './general-story-register-errors';
import { GeneralStoryRegisterPanel } from './general-story-register-panel';
import { GeneralStoryStartSettingPanel } from './general-story-start-setting-panel';
import {
  type GeneralStorySupportingCharacter,
  GeneralStorySupportingCharacterList,
} from './general-story-supporting-character-list';

const EMPTY_TEXT_VALUES = Object.fromEntries(
  Object.keys(GENERAL_STORY_TEXT_FIELDS).map((field) => [field, '']),
) as GeneralStoryTextValues;

/** 임시 저장 버튼 연타를 막는 간격이다. 첫 누름은 바로 저장하고 이 간격 안의 누름은 버린다. */
const DRAFT_SAVE_CLICK_THROTTLE_MS = 1000;

/** 임시 저장 결과 토스트의 id다. 같은 id로 다시 띄우면 이전 토스트를 대신한다. */
const DRAFT_SAVE_TOAST_ID = 'general-story-draft-save';

/**
 * 임시 저장본의 이미지로 폼 이미지를 만든다. 미리보기 blob URL은 저장한 파일로 다시 만든다.
 *
 * @param image 임시 저장한 이미지
 * @returns 폼에서 쓰는 이미지. 없으면 null
 */
const toDraftImage = (
  image: GeneralStoryDraftImage | null,
): DraftImage | null =>
  image && { ...image, previewUrl: URL.createObjectURL(image.blob) };

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

type DraftSaveButtonProps = {
  isSaving: boolean;
  disabled: boolean;
  onClick: () => void;
};

function DraftSaveButton({
  isSaving,
  disabled,
  onClick,
}: DraftSaveButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || isSaving}
      onClick={onClick}
      className={cn('relative', isSaving && 'disabled:opacity-100')}>
      <span className={cn(isSaving && 'invisible')}>
        {GENERAL_STORY_CREATE_COPY.draftSave}
      </span>
      {isSaving && <Spinner className="absolute" />}
    </Button>
  );
}

export function GeneralStoryCreateScreen() {
  const { entry, isError, retry } = useGeneralStoryDraftEntry();
  const showSkeleton = useDelayedLoading(!entry && !isError);

  if (entry) {
    return <GeneralStoryCreateForm initialRecord={entry.record} />;
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
  /** 이어서 만들 임시 저장본. 없으면 빈 폼으로 새로 만든다. */
  initialRecord: GeneralDraftRecord | null;
};

function GeneralStoryCreateForm({
  initialRecord,
}: GeneralStoryCreateFormProps) {
  const router = useRouter();
  const epoch = useCreationEpoch();
  const initial = initialRecord?.snapshot;
  const [requestId] = useState(
    () => initialRecord?.requestId ?? crypto.randomUUID(),
  );
  const [exitWarning, setExitWarning] =
    useState<GeneralStoryExitWarning>('nothing');
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [textValues, setTextValues] = useState(
    initial?.texts ?? EMPTY_TEXT_VALUES,
  );
  const [cover, setCover] = useState(() =>
    toDraftImage(initial?.cover ?? null),
  );
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
      ? initial.supporting.map((character) => ({
          ...character,
          image: toDraftImage(character.image),
        }))
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
  const lastSaveClickAtRef = useRef(0);
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
    initialRecord ? snapshotKey : null,
  );
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

  const saveDraft = async () => {
    if (hasInput && !isSaved && !isSaving) await writeDraft();
  };

  const handleSaveClick = async () => {
    const now = Date.now();

    if (
      isSaving ||
      now - lastSaveClickAtRef.current < DRAFT_SAVE_CLICK_THROTTLE_MS
    )
      return;

    lastSaveClickAtRef.current = now;

    if (isSaved || (await writeDraft())) {
      toast.success(TOAST_MESSAGE.STORY_DRAFT_SAVED, {
        id: DRAFT_SAVE_TOAST_ID,
      });
    }
  };

  const handleClose = () => {
    setExitWarning(getDraftExitWarning({ hasInput, hasSavedDraft, isSaved }));
    setIsExitOpen(true);
  };

  const { leaveAfterCleanup } = usePreventPageLeave({
    warnOnUnload: hasSavedDraft ? !isSaved : hasInput,
    interceptBack: true,
    onBackAttempt: () => (isExitOpen ? setIsExitOpen(false) : handleClose()),
  });

  const copy = GENERAL_STORY_EXIT_WARNING_COPY[exitWarning];

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-4">
        <h1 className="font-semibold">{GENERAL_STORY_CREATE_COPY.title}</h1>
        <div className="ml-auto flex items-center gap-1">
          <DraftSaveButton
            isSaving={isSaving}
            disabled={!hasInput}
            onClick={handleSaveClick}
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
      <CollapsedListItemsProvider>
        <GeneralStoryRegisterErrorsContext
          value={hasTriedRegister ? registerErrors : null}>
          <GeneralStoryFormTabs
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
              onClick={() =>
                leaveAfterCleanup(() => router.replace(APP_PATH.MAIN.STUDIO))
              }>
              {copy.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
