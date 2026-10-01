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
  idPrefix: string;
  labelPrefix: string;
  character: GeneralStoryCharacter;
  namePlaceholder: string;
  featurePlaceholder: string;
  basicInfoDescription: string;
  featureDescription: string;
  featureRequired: boolean;
  /** 있으면 최소 글자 수 오류보다 먼저 기본 정보 설명 대신 보이는 이름 오류다. */
  nameError?: string | null;
  /** 등록하기를 누른 뒤 이름·성별·특징의 오류를 찾는 키다(`REGISTER_ERROR_KEY`). */
  registerErrorKeys?: Record<'name' | 'gender' | 'feature', string>;
  /** 기본 정보와 특징 사이에 놓는 칸이다. 주변 인물의 인물 소개를 둔다. */
  afterBasicInfo?: ReactNode;
  onChange: (character: GeneralStoryCharacter) => void;
  nameInputRef?: (element: HTMLInputElement | null) => void;
};

export function GeneralStoryCharacterFields({
  idPrefix,
  labelPrefix,
  character,
  namePlaceholder,
  featurePlaceholder,
  basicInfoDescription,
  featureDescription,
  featureRequired,
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
    (touched.name ? getMinLengthError(nameLabel, character.name) : null);
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
              aria-required
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
          <FieldDescription className="break-keep text-foreground-secondary">
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
          <FieldDescription className="break-keep text-foreground-secondary">
            {featureDescription}
          </FieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}
