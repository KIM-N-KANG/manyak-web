'use client';

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
import { AddTagDialog } from '@/features/stories/_shared/components/add-tag-dialog';
import { TagChipGrid } from '@/features/stories/_shared/components/tag-chip-grid';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

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

type CharacterFormProps = {
  category: CharacterTagCategory;
  categoryLabel: string;
  character: CharacterInput;
  /** 스크린리더가 인물을 구분할 수 있게 붙이는 접두사(예: `주변 인물 1`) */
  fieldLabelPrefix: string;
  namePlaceholder: string;
  tagPlaceholder: string;
  predefinedTags: SimpleStoryTagListItemResponse[];
  /** 이 인물의 특징 수가 상한에 닿았는지. 참이면 고르지 않은 칩과 직접 추가를 막는다. */
  isMaxSelectionReached: boolean;
  /** 특징을 반드시 골라야 하는 인물(주인공)이면 라벨에 필수 표시를 붙인다. */
  isFeatureRequired: boolean;
  /** 특징 칩 아래에 띄울 설명. 특징이 선택 항목인 인물에만 넘긴다. */
  featureDescription?: string;
  isLoadingTags: boolean;
  /** 키워드 목록을 받지 못했는지. 참이면 칩 자리에 다시 시도 버튼을 보인다. */
  hasTagsError: boolean;
  onRetryTags: () => void;
  disabled: boolean;
  /** 이름 인풋 아래에 띄울 오류. 없으면 오류를 표시하지 않는다. */
  nameErrorMessage?: string;
  /** 이름 인풋을 인물 id로 등록한다. 인물을 추가했을 때 그 칸으로 스크롤하는 데 쓴다. */
  onRegisterNameInput?: (id: string, element: HTMLInputElement | null) => void;
  onChangeName: (name: string) => void;
  /** null이면 성별을 고르지 않은 상태(랜덤 성별)이며 AI가 정한다. */
  onChangeGender: (gender: CharacterGender | null) => void;
  /** `pressed`가 참이면 특징을 고르고, 거짓이면 해제한다. */
  onTogglePredefinedTag: (tagId: number, pressed: boolean) => void;
  /** 직접 추가한 특징을 켜거나 끈다. `tagId`는 직접 추가 키워드의 id다. */
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
  onRetryTags,
  disabled,
  nameErrorMessage,
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
    <FieldGroup className="gap-6">
      <Field className="gap-2" aria-labelledby={basicInfoLabelId}>
        <FieldLabel id={basicInfoLabelId} htmlFor={`${fieldId}-name`}>
          {CHARACTER_BASIC_INFO_LABEL}
        </FieldLabel>
        <div className="flex items-start gap-2">
          <InputGroup className="min-w-0 flex-[3]">
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
                'min-w-0 flex-[2]',
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
          onRetryTags={onRetryTags}
          disabled={disabled}
          addTagTrigger={
            <AddTagDialog
              categoryLabel={categoryLabel}
              fieldId={fieldId}
              placeholder={tagPlaceholder}
              disabled={disabled || isMaxSelectionReached}
              onAddTag={(tag) => {
                track('client_storyCreate_addTag_submitted', { category });
                onAddCustomTag(tag);
              }}
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
