'use client';

import { type SubmitEvent, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { getMeQueryKey } from '@/api/generated/endpoints/auth/auth';
import { useUpdateProfile } from '@/api/generated/endpoints/users/users';
import type {
  MeResponse,
  ProfilePresetResponse,
  UpdateProfileRequest,
} from '@/api/generated/models';
import { hasInAppNavigation } from '@/components/providers/in-app-navigation-tracker';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { usePreventPageLeave } from '@/hooks/use-prevent-page-leave';
import { FetchError } from '@/lib/custom-fetch';
import { track } from '@/observability/analytics';

import { NICKNAME_ERROR_COPY } from '../constants';
import { validateNickname } from '../utils/validate-nickname';

/**
 * 프로필 수정 폼의 입력 상태와 저장, 이탈 확인을 관리하는 훅.
 * 저장에 성공하면 회원 정보 캐시와 Auth.js 세션을 서버 기준으로 맞추고 들어온 화면으로 돌아간다.
 *
 * @param me 수정 전 회원 정보
 * @returns 입력값과 변경 함수, 오류, 제출 핸들러, 이탈 확인 다이얼로그 상태
 */
export function useProfileForm(me: MeResponse) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();
  const initialNickname = me.nickname ?? '';
  const [nickname, setNickname] = useState(initialNickname);
  const [preset, setPreset] = useState<ProfilePresetResponse | null>(null);
  const [nicknameError, setNicknameError] = useState<string>();
  const [isExitOpen, setIsExitOpen] = useState(false);

  const nicknameChanged = nickname !== initialNickname;
  const imageChanged =
    preset !== null && preset.imageUrl !== me.profileImageUrl;
  const isDirty = nicknameChanged || imageChanged;

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: (response) => {
        if (response.status === 200) {
          queryClient.setQueryData(getMeQueryKey(), response);
        }

        // 스토리 작성자처럼 닉네임을 담은 다른 화면의 캐시도 낡았으므로 모두 다시 받게 한다.
        void queryClient.invalidateQueries();
        void updateSession({ profileRefresh: true });
        track('client_profileEdit_completed', {
          nickname_changed: nicknameChanged,
          image_changed: imageChanged,
        });
        toast.success(TOAST_MESSAGE.PROFILE_SAVED);
        leave();
      },
      onError: (error) => {
        if (error instanceof FetchError && error.status === 409) {
          setNicknameError(NICKNAME_ERROR_COPY.taken);
        } else if (error instanceof FetchError && error.status === 400) {
          setNicknameError(NICKNAME_ERROR_COPY.rejected);
        } else {
          toast.error(TOAST_MESSAGE.PROFILE_SAVE_FAILED);
        }
      },
    },
  });
  const isSubmitting = updateProfile.isPending;

  const handleBackAttempt = () => {
    if (isExitOpen) {
      setIsExitOpen(false);
    } else if (isSubmitting) {
      return;
    } else if (isDirty) {
      setIsExitOpen(true);
    } else {
      leave();
    }
  };

  const { confirmLeave, leaveAfterCleanup } = usePreventPageLeave({
    warnOnUnload: isDirty,
    interceptBack: true,
    onBackAttempt: handleBackAttempt,
  });

  /** 들어온 화면으로 돌아간다. 주소로 바로 열었으면 마이로 바꿔 연다. */
  function leave() {
    if (hasInAppNavigation()) {
      confirmLeave();

      return;
    }

    leaveAfterCleanup(() => router.replace(APP_PATH.MAIN.MY));
  }

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    setNicknameError(undefined);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isDirty || isSubmitting) {
      return;
    }

    const error = nicknameChanged ? validateNickname(nickname) : undefined;

    if (error) {
      setNicknameError(error);

      return;
    }

    const data: UpdateProfileRequest = {};

    if (nicknameChanged) data.nickname = nickname;

    if (imageChanged) data.profileImagePreset = preset.key;

    updateProfile.mutate({ data });
  };

  return {
    nickname,
    nicknameError,
    imageUrl: preset?.imageUrl ?? me.profileImageUrl ?? null,
    isDirty,
    isSubmitting,
    isExitOpen,
    setIsExitOpen,
    handleNicknameChange,
    handlePresetSelect: setPreset,
    handleSubmit,
    leave,
  };
}
