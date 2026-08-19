'use client';

import type { ReactNode } from 'react';

import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';
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
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import {
  CHARACTER_BASIC_INFO_DESCRIPTION,
  CHARACTER_BASIC_INFO_LABEL,
  CHARACTER_FEATURE_LABEL,
  CHARACTER_GENDER_RANDOM_VALUE,
  CHARACTER_GENDER_SELECT_OPTIONS,
  CHARACTER_NAME_MAX_LENGTH,
} from '../../constants';
import type {
  CharacterGender,
  CharacterInput,
  CharacterTagCategory,
} from '../../types';
import { AddTagDialog } from './add-tag-dialog';
import { TagChipGrid } from './tag-chip-grid';

type CharacterFormProps = {
  category: CharacterTagCategory;
  categoryLabel: string;
  character: CharacterInput;
  /** 스크린리더가 인물을 구분할 수 있게 붙이는 접두사(예: `주변 인물 1`) */
  fieldLabelPrefix: string;
  namePlaceholder: string;
  tagPlaceholder: string;
  predefinedTags: SimpleStoryTagListItemResponse[];
  isMaxSelectionReached: boolean;
  /** 특징을 반드시 골라야 하는 인물(주인공)이면 라벨에 필수 표시를 붙인다. */
  isFeatureRequired: boolean;
  /** 특징 칩 아래에 띄울 설명. 특징이 선택 항목인 인물에만 넘긴다. */
  featureDescription?: string;
  isLoadingTags: boolean;
  hasTagsError: boolean;
  disabled: boolean;
  /** 이름 인풋 아래에 띄울 오류. 없으면 오류를 표시하지 않는다. */
  nameErrorMessage?: string;
  /** 기본 정보 라벨과 같은 줄 오른쪽 끝에 놓을 조작 버튼(주변 인물 삭제 등) */
  headerAction?: ReactNode;
  onRegisterNameInput?: (id: string, element: HTMLInputElement | null) => void;
  onChangeName: (name: string) => void;
  onChangeGender: (gender: CharacterGender | null) => void;
  onTogglePredefinedTag: (tagId: number, pressed: boolean) => void;
  onToggleCustomTag: (tagId: string, pressed: boolean) => void;
  onAddCustomTag: (name: string) => void;
};

export function CharacterForm({
  category,
  categoryLabel,
  character,
  fieldLabelPrefix,
  namePlaceholder,
  tagPlaceholder,
  predefinedTags,
  isMaxSelectionReached,
  isFeatureRequired,
  featureDescription,
  isLoadingTags,
  hasTagsError,
  disabled,
  nameErrorMessage,
  headerAction,
  onRegisterNameInput,
  onChangeName,
  onChangeGender,
  onTogglePredefinedTag,
  onToggleCustomTag,
  onAddCustomTag,
}: CharacterFormProps) {
  const fieldId = `${category}-${character.id}`;
  const nameErrorId = `${fieldId}-name-error`;
  const basicInfoLabelId = `${fieldId}-basic-info-label`;
  const featureLabelId = `${fieldId}-feature-label`;

  return (
    <FieldGroup className="gap-8">
      <Field className="gap-2" aria-labelledby={basicInfoLabelId}>
        {/* 삭제 버튼이 라벨보다 커서 줄 높이를 밀어내지 않도록 흐름에서 빼낸다.
            버튼이 없는 주인공 폼과 라벨~인풋 간격을 같게 유지한다. */}
        <div className="relative flex items-center">
          <FieldLabel id={basicInfoLabelId} htmlFor={`${fieldId}-name`}>
            {CHARACTER_BASIC_INFO_LABEL}
          </FieldLabel>
          {headerAction && (
            <div className="absolute top-1/2 -right-1 -translate-y-1/2">
              {headerAction}
            </div>
          )}
        </div>
        <div className="flex items-start gap-2">
          <InputGroup className="flex-1">
            <InputGroupInput
              id={`${fieldId}-name`}
              ref={(element) => onRegisterNameInput?.(character.id, element)}
              aria-label={`${fieldLabelPrefix} 이름`}
              aria-invalid={nameErrorMessage ? true : undefined}
              aria-describedby={nameErrorMessage ? nameErrorId : undefined}
              maxLength={CHARACTER_NAME_MAX_LENGTH}
              placeholder={namePlaceholder}
              value={character.name}
              disabled={disabled}
              onChange={(event) => onChangeName(event.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>
                {character.name.length} / {CHARACTER_NAME_MAX_LENGTH}
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          {/* 성별을 고르지 않은 상태는 "랜덤 성별"로 보여 주고 요청에는 null로 나간다.
              아직 고르지 않았다는 뜻이 드러나도록 인풋 플레이스홀더와 같은 색을 쓴다. */}
          <Select
            value={character.gender ?? CHARACTER_GENDER_RANDOM_VALUE}
            disabled={disabled}
            items={CHARACTER_GENDER_SELECT_OPTIONS.map(({ value, label }) => ({
              value,
              label,
            }))}
            onValueChange={(next) =>
              onChangeGender(
                next === CHARACTER_GENDER_RANDOM_VALUE
                  ? null
                  : (next as CharacterGender),
              )
            }>
            <SelectTrigger
              className={cn(
                'w-32 shrink-0',
                character.gender === null && 'text-foreground-tertiary',
              )}
              aria-label={`${fieldLabelPrefix} 성별`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {CHARACTER_GENDER_SELECT_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FieldError id={nameErrorId}>{nameErrorMessage}</FieldError>
        <FieldDescription className="text-foreground-secondary">
          {CHARACTER_BASIC_INFO_DESCRIPTION}
        </FieldDescription>
      </Field>

      <Field className="gap-2" aria-labelledby={featureLabelId}>
        <FieldLabel id={featureLabelId} className="gap-0.5">
          {CHARACTER_FEATURE_LABEL}
          {isFeatureRequired && <span className="text-destructive">*</span>}
        </FieldLabel>
        <TagChipGrid
          keyPrefix={fieldId}
          predefinedTags={predefinedTags}
          customTags={character.customTags}
          selectedTagIds={character.selectedTagIds}
          selectedCustomTagIds={character.selectedCustomTagIds}
          isMaxSelectionReached={isMaxSelectionReached}
          isLoadingTags={isLoadingTags}
          hasTagsError={hasTagsError}
          disabled={disabled}
          addTagTrigger={
            <AddTagDialog
              category={category}
              categoryLabel={categoryLabel}
              fieldId={fieldId}
              placeholder={tagPlaceholder}
              disabled={disabled || isMaxSelectionReached}
              onAddTag={onAddCustomTag}
            />
          }
          onTogglePredefinedTag={onTogglePredefinedTag}
          onToggleCustomTag={onToggleCustomTag}
        />
        {featureDescription && (
          <FieldDescription className="text-foreground-secondary">
            {featureDescription}
          </FieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}
