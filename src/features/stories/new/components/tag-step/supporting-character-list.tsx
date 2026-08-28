'use client';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  CHARACTER_FEATURE_RANDOM_DESCRIPTION,
  CHARACTER_NAME_DUPLICATE_ERROR,
  CHARACTER_NAME_RESERVED_CHARACTER_ERROR,
  SUPPORTING_CHARACTER_MAX_COUNT,
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
  hasReservedCharacterName: (characterId: string) => boolean;
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
  hasReservedCharacterName,
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
        const order = index + 1;
        const fieldLabelPrefix = `${categoryLabel} ${order}`;
        const headerLabel = character.name.trim()
          ? character.name
          : fieldLabelPrefix;
        const namePlaceholder =
          SUPPORTING_CHARACTER_NAME_PLACEHOLDERS[
            index % SUPPORTING_CHARACTER_NAME_PLACEHOLDERS.length
          ];

        return (
          <section key={character.id} className="flex flex-col gap-4">
            <div className="flex min-h-12 items-center bg-muted px-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-foreground-secondary">
                  {headerLabel}
                </span>
                <span className="shrink-0 rounded-full bg-border px-2 py-1 text-xs leading-none text-foreground-secondary">
                  {order}/{SUPPORTING_CHARACTER_MAX_COUNT}
                </span>
              </div>
              <Button
                type="button"
                size="lg"
                variant="ghost"
                aria-label={`${headerLabel} 삭제`}
                disabled={disabled}
                onClick={() => onRemoveCharacter(character.id)}
                className="w-12 justify-end rounded-none px-0 text-sm text-foreground-secondary">
                삭제
              </Button>
            </div>

            <div className="px-4">
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
                  hasReservedCharacterName(character.id)
                    ? CHARACTER_NAME_RESERVED_CHARACTER_ERROR
                    : isDuplicateName(character.id)
                      ? CHARACTER_NAME_DUPLICATE_ERROR
                      : undefined
                }
                onRegisterNameInput={onRegisterNameInput}
                onChangeName={(name) => onChangeName(character.id, name)}
                onChangeGender={(gender) =>
                  onChangeGender(character.id, gender)
                }
                onTogglePredefinedTag={(tagId, pressed) =>
                  onTogglePredefinedTag(character.id, tagId, pressed)
                }
                onToggleCustomTag={(tagId, pressed) =>
                  onToggleCustomTag(character.id, tagId, pressed)
                }
                onAddCustomTag={(name) => onAddCustomTag(character.id, name)}
              />
            </div>
          </section>
        );
      })}

      <div
        className={cn(
          'flex justify-center',
          characters.length === 0 && 'pt-4',
        )}>
        <Button
          type="button"
          variant="secondary"
          disabled={!canAddCharacter || disabled}
          onClick={onAddCharacter}>
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          인물 추가
        </Button>
      </div>
    </div>
  );
}
