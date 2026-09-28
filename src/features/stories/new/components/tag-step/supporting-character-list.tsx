'use client';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';
import { CollapsibleListItem } from '@/components/common/collapsible-list-item';
import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { Button } from '@/components/ui/button';
import { useDiscardConfirm } from '@/hooks/use-discard-confirm';
import { cn } from '@/lib/utils';

import {
  CHARACTER_FEATURE_RANDOM_DESCRIPTION,
  CHARACTER_NAME_DUPLICATE_ERROR,
  SUPPORTING_CHARACTER_EMPTY_DESCRIPTION,
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
  const { request: requestDiscard, dialogProps } =
    useDiscardConfirm(onRemoveCharacter);

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
          <CollapsibleListItem
            key={character.id}
            id={`supporting-character-${character.id}`}
            label={headerLabel}
            order={order}
            maxCount={SUPPORTING_CHARACTER_MAX_COUNT}
            removeDisabled={disabled}
            onRemove={() =>
              requestDiscard(
                character.id,
                Boolean(
                  character.name.trim() ||
                  character.gender ||
                  character.selectedTagIds.length ||
                  character.customTags.length,
                ),
              )
            }>
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
                  isDuplicateName(character.id)
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
          </CollapsibleListItem>
        );
      })}

      <div
        className={cn(
          'flex flex-col items-center gap-4',
          characters.length === 0 && 'pt-4',
        )}>
        {characters.length === 0 && (
          <p className="text-sm text-foreground-secondary">
            {SUPPORTING_CHARACTER_EMPTY_DESCRIPTION}
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={!canAddCharacter || disabled}
          onClick={onAddCharacter}>
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          인물 추가
        </Button>
      </div>
      <ConfirmAlertDialog {...dialogProps} />
    </div>
  );
}
