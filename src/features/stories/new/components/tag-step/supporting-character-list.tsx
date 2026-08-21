'use client';

import { Cancel01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';

import {
  CHARACTER_FEATURE_RANDOM_DESCRIPTION,
  CHARACTER_NAME_DUPLICATE_ERROR,
  SUPPORTING_CHARACTER_NAME_PLACEHOLDERS,
} from '../../constants';
import type { CharacterGender, CharacterInput } from '../../types';
import { CharacterForm } from './character-form';

type SupportingCharacterListProps = {
  categoryLabel: string;
  characters: CharacterInput[];
  tagPlaceholder: string;
  predefinedTags: SimpleStoryTagListItemResponse[];
  canAddCharacter: boolean;
  isLoadingTags: boolean;
  hasTagsError: boolean;
  disabled: boolean;
  isFeatureMaxReached: (characterId: string) => boolean;
  isDuplicateName: (characterId: string) => boolean;
  onRegisterNameInput: (id: string, element: HTMLInputElement | null) => void;
  onChangeName: (characterId: string, name: string) => void;
  onChangeGender: (characterId: string, gender: CharacterGender | null) => void;
  onTogglePredefinedTag: (
    characterId: string,
    tagId: number,
    pressed: boolean,
  ) => void;
  onToggleCustomTag: (
    characterId: string,
    tagId: string,
    pressed: boolean,
  ) => void;
  onAddCustomTag: (characterId: string, name: string) => void;
  onAddCharacter: () => void;
  onRemoveCharacter: (characterId: string) => void;
};

export function SupportingCharacterList({
  categoryLabel,
  characters,
  tagPlaceholder,
  predefinedTags,
  canAddCharacter,
  isLoadingTags,
  hasTagsError,
  disabled,
  isFeatureMaxReached,
  isDuplicateName,
  onRegisterNameInput,
  onChangeName,
  onChangeGender,
  onTogglePredefinedTag,
  onToggleCustomTag,
  onAddCustomTag,
  onAddCharacter,
  onRemoveCharacter,
}: SupportingCharacterListProps) {
  return (
    <div className="flex flex-col gap-4">
      {characters.map((character, index) => {
        const fieldLabelPrefix = `주변 인물 ${index + 1}`;
        const namePlaceholder =
          SUPPORTING_CHARACTER_NAME_PLACEHOLDERS[
            index % SUPPORTING_CHARACTER_NAME_PLACEHOLDERS.length
          ];

        return (
          <div
            key={character.id}
            className="rounded-lg border border-border p-4">
            <CharacterForm
              category="SUPPORTING_CHARACTER"
              categoryLabel={categoryLabel}
              character={character}
              fieldLabelPrefix={fieldLabelPrefix}
              namePlaceholder={namePlaceholder}
              tagPlaceholder={tagPlaceholder}
              predefinedTags={predefinedTags}
              isMaxSelectionReached={isFeatureMaxReached(character.id)}
              isFeatureRequired={false}
              featureDescription={CHARACTER_FEATURE_RANDOM_DESCRIPTION}
              isLoadingTags={isLoadingTags}
              hasTagsError={hasTagsError}
              disabled={disabled}
              nameErrorMessage={
                isDuplicateName(character.id)
                  ? CHARACTER_NAME_DUPLICATE_ERROR
                  : undefined
              }
              headerAction={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`${fieldLabelPrefix} 삭제`}
                  disabled={disabled}
                  onClick={() => onRemoveCharacter(character.id)}
                  className="shrink-0 text-foreground-secondary">
                  <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                </Button>
              }
              onRegisterNameInput={onRegisterNameInput}
              onChangeName={(name) => onChangeName(character.id, name)}
              onChangeGender={(gender) => onChangeGender(character.id, gender)}
              onTogglePredefinedTag={(tagId, pressed) =>
                onTogglePredefinedTag(character.id, tagId, pressed)
              }
              onToggleCustomTag={(tagId, pressed) =>
                onToggleCustomTag(character.id, tagId, pressed)
              }
              onAddCustomTag={(name) => onAddCustomTag(character.id, name)}
            />
          </div>
        );
      })}

      <Button
        type="button"
        variant="secondary"
        className="self-center"
        disabled={!canAddCharacter || disabled}
        onClick={onAddCharacter}>
        <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
        인물 추가
      </Button>
    </div>
  );
}
