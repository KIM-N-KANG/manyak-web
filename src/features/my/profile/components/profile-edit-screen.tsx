'use client';

import { useEffect, useState } from 'react';

import { Edit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';

import { useMe } from '@/api/generated/endpoints/auth/auth';
import type { MeResponse } from '@/api/generated/models';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { useGuestLoginRedirect } from '@/features/my/_shared/hooks/use-guest-login-redirect';
import { DRAFT_EXIT_WARNING_COPY } from '@/features/stories/_shared/constants/draft-exit-warning';
import { track } from '@/observability/analytics';

import { NICKNAME_MAX_LENGTH, PROFILE_EDIT_COPY } from '../constants';
import { useProfileForm } from '../hooks/use-profile-form';
import { ProfilePresetSheet } from './profile-preset-sheet';

const EXIT_COPY = DRAFT_EXIT_WARNING_COPY.unsavedEdit;

export function ProfileEditScreen() {
  const { isMember } = useMemberAccess();
  const { data, isError, refetch } = useMe({ query: { enabled: isMember } });
  const me = data?.status === 200 ? data.data : undefined;

  useGuestLoginRedirect();
  useEffect(() => {
    track('client_profileEdit_viewed');
  }, []);

  if (me) {
    return <ProfileForm me={me} />;
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
        <p className="text-foreground-secondary">
          {PROFILE_EDIT_COPY.loadFailed}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          {PROFILE_EDIT_COPY.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 p-4" aria-busy="true">
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function ProfileForm({ me }: { me: MeResponse }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const {
    nickname,
    nicknameError,
    imageUrl,
    isDirty,
    isSubmitting,
    isExitOpen,
    setIsExitOpen,
    handleNicknameChange,
    handlePresetSelect,
    handleSubmit,
    leave,
  } = useProfileForm(me);
  const blurDataURL =
    imageUrl === me.profileImageUrl && me.profileThumbnailBase64
      ? `data:image/png;base64,${me.profileThumbnailBase64}`
      : undefined;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 scroll-fade-b flex-col gap-8 overflow-y-auto overscroll-contain p-4">
        <button
          type="button"
          aria-label={PROFILE_EDIT_COPY.imageButtonLabel}
          disabled={isSubmitting}
          className="relative mx-auto block size-24 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setIsSheetOpen(true)}>
          <span className="block size-full overflow-hidden rounded-full bg-muted">
            {imageUrl && (
              <Image
                src={imageUrl}
                alt=""
                width={96}
                height={96}
                placeholder={blurDataURL ? 'blur' : 'empty'}
                blurDataURL={blurDataURL}
                className="size-full object-cover"
              />
            )}
          </span>
          <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-background bg-foreground text-background">
            <HugeiconsIcon icon={Edit02Icon} className="size-4" aria-hidden />
          </span>
        </button>

        <Field className="gap-2">
          <FieldLabel htmlFor="profile-nickname">
            {PROFILE_EDIT_COPY.nicknameLabel}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="profile-nickname"
              aria-invalid={nicknameError ? true : undefined}
              aria-describedby="profile-nickname-hint"
              maxLength={NICKNAME_MAX_LENGTH}
              autoComplete="off"
              value={nickname}
              disabled={isSubmitting}
              onChange={(event) => handleNicknameChange(event.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>
                {nickname.length} / {NICKNAME_MAX_LENGTH}
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          {nicknameError ? (
            <FieldError id="profile-nickname-hint">{nicknameError}</FieldError>
          ) : (
            <FieldDescription
              id="profile-nickname-hint"
              className="text-foreground-secondary">
              {PROFILE_EDIT_COPY.nicknameDescription}
            </FieldDescription>
          )}
        </Field>
      </div>

      <div className="flex shrink-0 flex-col px-4 pb-4">
        <Button
          type="submit"
          size="lg"
          className="relative w-full"
          aria-busy={isSubmitting}
          disabled={!isDirty || isSubmitting}>
          <LoadingButtonContent
            isLoading={isSubmitting}
            loadingLabel={PROFILE_EDIT_COPY.submitting}>
            {PROFILE_EDIT_COPY.submit}
          </LoadingButtonContent>
        </Button>
      </div>

      <ProfilePresetSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        selectedImageUrl={imageUrl}
        onSelect={(preset) => {
          handlePresetSelect(preset);
          setIsSheetOpen(false);
        }}
      />

      <AlertDialog open={isExitOpen} onOpenChange={setIsExitOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{EXIT_COPY.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {EXIT_COPY.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{EXIT_COPY.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={leave}>
              {EXIT_COPY.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
