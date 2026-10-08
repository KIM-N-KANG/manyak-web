'use client';

import { type SubmitEvent, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  getListQueryKey as getPersonasQueryKey,
  useCreate as useCreatePersona,
} from '@/api/generated/endpoints/user-persona-controller/user-persona-controller';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { FetchError } from '@/lib/custom-fetch';

import { PERSONA_CREATE_ERROR_COPY } from '../constants';
import {
  buildPersonaDescription,
  type PersonaGender,
} from '../utils/persona-description';

type PersonaField = 'name' | 'gender' | 'feature';

type PersonaFormErrors = Partial<Record<PersonaField, string>>;

/**
 * 페르소나 생성 폼의 입력 상태와 제출을 관리하는 훅.
 * 생성에 성공하면 목록 조회를 무효화하고 들어온 화면으로 돌아간다.
 *
 * @returns 입력값과 변경 함수, 필드별 오류, 제출 핸들러, 제출 중 여부
 */
export function usePersonaCreateForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<PersonaGender | null>(null);
  const [feature, setFeature] = useState('');
  const [errors, setErrors] = useState<PersonaFormErrors>({});

  const createPersona = useCreatePersona({
    mutation: {
      onSuccess: async () => {
        toast.success(TOAST_MESSAGE.PERSONA_CREATED);
        await queryClient.invalidateQueries({
          queryKey: getPersonasQueryKey(),
        });

        if (window.history.length > 1) {
          router.back();

          return;
        }

        router.replace(APP_PATH.MAIN.STORIES);
      },
      onError: (error) => {
        toast.error(
          error instanceof FetchError && error.status === 409
            ? TOAST_MESSAGE.PERSONA_LIMIT_REACHED
            : TOAST_MESSAGE.PERSONA_CREATE_FAILED,
        );
      },
    },
  });

  const clearError = (field: PersonaField) =>
    setErrors((previous) => ({ ...previous, [field]: undefined }));

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: PersonaFormErrors = {
      name: name.trim() ? undefined : PERSONA_CREATE_ERROR_COPY.name,
      gender: gender ? undefined : PERSONA_CREATE_ERROR_COPY.gender,
      feature: feature.trim() ? undefined : PERSONA_CREATE_ERROR_COPY.feature,
    };

    setErrors(nextErrors);

    if (!gender || Object.values(nextErrors).some(Boolean)) {
      return;
    }

    createPersona.mutate({
      data: {
        name: name.trim(),
        description: buildPersonaDescription(gender, feature),
      },
    });
  };

  return {
    name,
    gender,
    feature,
    errors,
    handleNameChange: (value: string) => {
      setName(value);
      clearError('name');
    },
    handleGenderChange: (value: PersonaGender) => {
      setGender(value);
      clearError('gender');
    },
    handleFeatureChange: (value: string) => {
      setFeature(value);
      clearError('feature');
    },
    handleSubmit,
    isSubmitting: createPersona.isPending || createPersona.isSuccess,
  };
}
