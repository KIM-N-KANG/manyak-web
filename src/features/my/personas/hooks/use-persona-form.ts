'use client';

import { type SubmitEvent, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  getListQueryKey as getPersonasQueryKey,
  useCreate as useCreatePersona,
  useUpdate as useUpdatePersona,
} from '@/api/generated/endpoints/user-persona-controller/user-persona-controller';
import type { UserPersonaResponse } from '@/api/generated/models';
import { hasInAppNavigation } from '@/components/providers/in-app-navigation-tracker';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { selectCreatedPersona } from '@/features/stories/_shared/utils/created-persona-selection';
import { FetchError } from '@/lib/custom-fetch';
import { track } from '@/observability/analytics';

import { PERSONA_CREATE_ERROR_COPY } from '../constants';
import {
  buildPersonaDescription,
  parsePersonaDescription,
  type PersonaGender,
} from '../utils/persona-description';

type PersonaField = 'name' | 'gender' | 'feature';

type PersonaFormErrors = Partial<Record<PersonaField, string>>;

/**
 * 페르소나 생성과 수정 폼의 입력 상태와 제출을 관리하는 훅.
 * 저장에 성공하면 목록 조회를 무효화하고 들어온 화면으로 돌아간다. 새로 만든 페르소나는 스토리 상세에서
 * 왔으면 그 상세의 선택으로 남긴다.
 *
 * @param persona 수정할 페르소나. 없으면 새로 만든다
 * @returns 입력값과 변경 함수, 필드별 오류, 제출 핸들러, 제출 중 여부
 */
export function usePersonaForm(persona?: UserPersonaResponse) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [initial] = useState(() =>
    parsePersonaDescription(persona?.description),
  );
  const [name, setName] = useState(persona?.name ?? '');
  const [gender, setGender] = useState<PersonaGender | null>(initial.gender);
  const [feature, setFeature] = useState(initial.feature);
  const [errors, setErrors] = useState<PersonaFormErrors>({});

  const leave = async () => {
    await queryClient.invalidateQueries({ queryKey: getPersonasQueryKey() });

    if (hasInAppNavigation()) {
      router.back();

      return;
    }

    router.replace(APP_PATH.MY_PERSONAS);
  };

  const createPersona = useCreatePersona({
    mutation: {
      onSuccess: async (response) => {
        const personaId =
          response.status === 201 ? response.data.id : undefined;

        track('client_personaCreate_completed');
        toast.success(TOAST_MESSAGE.PERSONA_CREATED);

        if (personaId) {
          selectCreatedPersona(personaId);
        }

        await leave();
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

  const updatePersona = useUpdatePersona({
    mutation: {
      onSuccess: async () => {
        track('client_personaEdit_completed');
        toast.success(TOAST_MESSAGE.PERSONA_UPDATED);
        await leave();
      },
      onError: () => {
        toast.error(TOAST_MESSAGE.PERSONA_UPDATE_FAILED);
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

    const data = {
      name: name.trim(),
      description: buildPersonaDescription(gender, feature),
    };

    if (persona?.id) {
      track('client_personaEdit_form_submitted');
      updatePersona.mutate({ personaId: persona.id, data });

      return;
    }

    track('client_personaCreate_form_submitted');
    createPersona.mutate({ data });
  };

  const mutation = persona ? updatePersona : createPersona;

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
    isSubmitting: mutation.isPending || mutation.isSuccess,
  };
}
