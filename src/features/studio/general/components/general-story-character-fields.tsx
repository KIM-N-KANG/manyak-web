import { type ReactNode, useState } from 'react';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GENERAL_STORY_CHARACTER_COPY } from '@/features/studio/general/constants';
import type {
  CharacterGender,
  GeneralStoryCharacter,
} from '@/features/studio/general/utils/character-settings';
import { getMinLengthError } from '@/features/studio/general/utils/general-story-text-error';
import { cn } from '@/lib/utils';

import { useRegisterError } from './general-story-register-errors';

const GENDER_OPTIONS = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
] as const satisfies readonly { value: CharacterGender; label: string }[];

const GENDER_ITEMS = [
  { value: null, label: GENERAL_STORY_CHARACTER_COPY.genderPlaceholder },
  ...GENDER_OPTIONS,
];

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    *
  </span>
);

type GeneralStoryCharacterFieldsProps = {
  /** 입력 요소 id와 오류 문구 id의 접두사다. 한 화면의 인물마다 달라야 한다. */
  idPrefix: string;
  /** 이름과 성별 입력의 aria-label 앞에 붙는 인물 구분(예: 주인공)이다. */
  labelPrefix: string;
  character: GeneralStoryCharacter;
  namePlaceholder: string;
  featurePlaceholder: string;
  /** 기본 정보 칸 아래 설명이다. 이름이나 성별 오류가 있으면 오류 문구가 대신 보인다. */
  basicInfoDescription: string;
  /** 특징 칸 아래 설명이다. 특징 오류가 있으면 오류 문구가 대신 보인다. */
  featureDescription: string;
  /** 특징의 필수 표시와 aria-required만 정한다. 최소 글자 수는 필수가 아니어도 본다. */
  featureRequired: boolean;
  /** 이름이 필수인지다. 기본 주인공 이름은 선택이라 비워도 되고 최소 글자 수도 보지 않는다. */
  nameRequired?: boolean;
  /** 있으면 최소 글자 수 오류보다 먼저 기본 정보 설명 대신 보이는 이름 오류다. */
  nameError?: string | null;
  /** 등록하기를 누른 뒤 이름·성별·특징의 오류를 찾는 키다(`REGISTER_ERROR_KEY`). */
  registerErrorKeys?: Record<'name' | 'gender' | 'feature', string>;
  /** 기본 정보와 특징 사이에 놓는 칸이다. 주변 인물의 인물 소개를 둔다. */
  afterBasicInfo?: ReactNode;
  /** 바뀐 인물 전체를 넘긴다. 상태는 부모가 가진다. */
  onChange: (character: GeneralStoryCharacter) => void;
  /** 이름 입력 요소를 받는 콜백 ref다. 주변 인물 목록이 추가한 인물의 이름 칸으로 스크롤할 때 쓴다. */
  nameInputRef?: (element: HTMLInputElement | null) => void;
};

/**
 * 인물 한 명의 기본 정보(이름, 성별)와 특징 입력. 주인공과 주변 인물이 함께 쓰는 제어 컴포넌트다.
 *
 * @remarks
 * 이름 오류는 `nameError`, 등록 오류, 최소 글자 수 순으로 하나만 보이고, 이름 오류가 없을 때 성별 오류가
 * 같은 자리에 보인다. 최소 글자 수 오류는 칸을 한 번 벗어난(blur) 뒤부터 보인다.
 */
export function GeneralStoryCharacterFields({
  idPrefix,
  labelPrefix,
  character,
  namePlaceholder,
  featurePlaceholder,
  basicInfoDescription,
  featureDescription,
  featureRequired,
  nameRequired = true,
  nameError,
  registerErrorKeys,
  afterBasicInfo,
  onChange,
  nameInputRef,
}: GeneralStoryCharacterFieldsProps) {
  const {
    basicInfoLabel,
    nameLabel,
    genderLabel,
    featureLabel,
    nameMaxLength,
    featureMaxLength,
  } = GENERAL_STORY_CHARACTER_COPY;
  const [touched, setTouched] = useState({ name: false, feature: false });
  const registerNameError = useRegisterError(registerErrorKeys?.name);
  const genderError = useRegisterError(registerErrorKeys?.gender);
  const registerFeatureError = useRegisterError(registerErrorKeys?.feature);
  const shownNameError =
    nameError ??
    registerNameError ??
    (nameRequired && touched.name
      ? getMinLengthError(nameLabel, character.name)
      : null);
  const basicInfoError = shownNameError ?? genderError;
  const featureError =
    registerFeatureError ??
    (touched.feature
      ? getMinLengthError(featureLabel, character.feature)
      : null);
  const nameErrorId = `${idPrefix}-name-error`;
  const featureErrorId = `${idPrefix}-feature-error`;

  return (
    <FieldGroup className="gap-6">
      <Field className="gap-2">
        <FieldLabel htmlFor={`${idPrefix}-name`} className="gap-0.5">
          {basicInfoLabel}
          <RequiredMark />
        </FieldLabel>
        <div className="flex items-start gap-2">
          <InputGroup className="min-w-0 flex-[3]">
            <InputGroupInput
              id={`${idPrefix}-name`}
              ref={nameInputRef}
              aria-label={`${labelPrefix} ${nameLabel}`}
              aria-required={nameRequired}
              aria-invalid={shownNameError ? true : undefined}
              aria-describedby={shownNameError ? nameErrorId : undefined}
              maxLength={nameMaxLength}
              placeholder={namePlaceholder}
              value={character.name}
              onChange={(event) =>
                onChange({ ...character, name: event.target.value })
              }
              onBlur={() =>
                setTouched((previous) => ({ ...previous, name: true }))
              }
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>
                {character.name.length} / {nameMaxLength}
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <Select
            value={character.gender}
            items={GENDER_ITEMS}
            onValueChange={(gender) =>
              onChange({ ...character, gender: gender as CharacterGender })
            }>
            <SelectTrigger
              className={cn(
                'min-w-0 flex-[2]',
                character.gender === null && 'text-foreground-tertiary',
              )}
              aria-label={`${labelPrefix} ${genderLabel}`}
              aria-required
              aria-invalid={genderError ? true : undefined}
              aria-describedby={genderError ? nameErrorId : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {GENDER_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {basicInfoError ? (
          <FieldError id={nameErrorId}>{basicInfoError}</FieldError>
        ) : (
          <FieldDescription className="text-foreground-secondary">
            {basicInfoDescription}
          </FieldDescription>
        )}
      </Field>

      {afterBasicInfo}

      <Field className="gap-2">
        <FieldLabel htmlFor={`${idPrefix}-feature`} className="gap-0.5">
          {featureLabel}
          {featureRequired && <RequiredMark />}
        </FieldLabel>
        <InputGroup>
          <InputGroupTextarea
            id={`${idPrefix}-feature`}
            aria-required={featureRequired}
            aria-invalid={featureError ? true : undefined}
            aria-describedby={featureError ? featureErrorId : undefined}
            maxLength={featureMaxLength}
            placeholder={featurePlaceholder}
            value={character.feature}
            className="max-h-70 min-h-28"
            onChange={(event) =>
              onChange({ ...character, feature: event.target.value })
            }
            onBlur={() =>
              setTouched((previous) => ({ ...previous, feature: true }))
            }
          />
          <InputGroupAddon align="block-end">
            <InputGroupText>
              {character.feature.length} / {featureMaxLength}
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        {featureError ? (
          <FieldError id={featureErrorId}>{featureError}</FieldError>
        ) : (
          <FieldDescription className="text-foreground-secondary">
            {featureDescription}
          </FieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}
