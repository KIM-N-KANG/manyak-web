import type { Dispatch, SetStateAction } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { CollapsibleListItem } from '@/components/common/collapsible-list-item';
import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { Button } from '@/components/ui/button';
import {
  GENERAL_STORY_CHARACTER_COPY,
  GENERAL_STORY_DUPLICATE_NAME_ERROR,
  GENERAL_STORY_TABS,
} from '@/features/studio/general/constants';
import type { DraftImage } from '@/features/studio/general/hooks/use-draft-image-picker';
import type { GeneralStoryCharacter } from '@/features/studio/general/utils/character-settings';
import { getDuplicateCharacterNameIds } from '@/features/studio/general/utils/duplicate-name';
import { REGISTER_ERROR_KEY } from '@/features/studio/general/utils/register-validation';
import { useDiscardConfirm } from '@/hooks/use-discard-confirm';
import { useInputRefRegistry } from '@/hooks/use-input-ref-registry';

import { GeneralStoryCharacterFields } from './general-story-character-fields';
import { GeneralStoryImageField } from './general-story-image-field';

export type GeneralStorySupportingCharacter = GeneralStoryCharacter & {
  id: string;
  image: DraftImage | null;
};

const SUPPORTING_LABEL =
  GENERAL_STORY_TABS.find(({ value }) => value === 'supporting')?.label ?? '';

type GeneralStorySupportingCharacterListProps = {
  /** 주변 인물 이름이 주인공 이름과 겹치는지 볼 때 쓴다. */
  protagonistName: string;
  characters: GeneralStorySupportingCharacter[];
  onChange: Dispatch<SetStateAction<GeneralStorySupportingCharacter[]>>;
};

export function GeneralStorySupportingCharacterList({
  protagonistName,
  characters,
  onChange,
}: GeneralStorySupportingCharacterListProps) {
  const {
    supportingMaxCount,
    supportingNamePlaceholders,
    supportingFeaturePlaceholder,
    addSupporting,
  } = GENERAL_STORY_CHARACTER_COPY;
  const canRemove = characters.length > 1;
  const duplicateNameIds = getDuplicateCharacterNameIds(
    protagonistName,
    characters,
  );
  const { registerInput, scrollInputIntoView } =
    useInputRefRegistry<HTMLInputElement>();
  const { request: requestDiscard, dialogProps } = useDiscardConfirm((id) => {
    const removed = characters.find((item) => item.id === id);

    if (removed?.image) {
      URL.revokeObjectURL(removed.image.previewUrl);
    }

    onChange((previous) => previous.filter((item) => item.id !== id));
  });

  const update = (
    id: string,
    changes: Partial<GeneralStorySupportingCharacter>,
  ) =>
    onChange((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );

  const add = () => {
    const id = crypto.randomUUID();

    onChange((previous) => [
      ...previous,
      { id, name: '', gender: null, feature: '', image: null },
    ]);
    scrollInputIntoView(id);
  };

  return (
    <div className="flex flex-col gap-4">
      {characters.map((character, index) => {
        const order = index + 1;
        const labelPrefix = `${SUPPORTING_LABEL} ${order}`;
        const headerLabel = character.name.trim() || labelPrefix;

        return (
          <CollapsibleListItem
            key={character.id}
            id={`general-story-supporting-${character.id}`}
            label={headerLabel}
            order={order}
            maxCount={supportingMaxCount}
            onRemove={
              canRemove
                ? () =>
                    requestDiscard(
                      character.id,
                      Boolean(
                        character.name.trim() ||
                        character.gender ||
                        character.feature.trim() ||
                        character.image,
                      ),
                    )
                : undefined
            }>
            <div className="flex flex-col gap-6 px-4">
              <GeneralStoryImageField
                id={`general-story-supporting-${character.id}-image`}
                label={GENERAL_STORY_CHARACTER_COPY.imageLabel}
                kind="CHARACTER"
                ratio={4 / 3}
                widthClassName="w-32"
                ratioHint={GENERAL_STORY_CHARACTER_COPY.imageRatioHint}
                description={GENERAL_STORY_CHARACTER_COPY.imageDescription}
                ariaLabelPrefix={labelPrefix}
                registerErrorKey={REGISTER_ERROR_KEY.supportingImage(
                  character.id,
                )}
                image={character.image}
                onChange={(image) => update(character.id, { image })}
              />
              <GeneralStoryCharacterFields
                idPrefix={`general-story-supporting-${character.id}`}
                labelPrefix={labelPrefix}
                character={character}
                namePlaceholder={
                  supportingNamePlaceholders[
                    index % supportingNamePlaceholders.length
                  ]
                }
                featurePlaceholder={supportingFeaturePlaceholder}
                basicInfoDescription={
                  GENERAL_STORY_CHARACTER_COPY.supportingBasicInfoDescription
                }
                featureDescription={
                  GENERAL_STORY_CHARACTER_COPY.supportingFeatureDescription
                }
                featureRequired={false}
                registerErrorKeys={{
                  name: REGISTER_ERROR_KEY.supporting(character.id, 'name'),
                  gender: REGISTER_ERROR_KEY.supporting(character.id, 'gender'),
                  feature: REGISTER_ERROR_KEY.supporting(
                    character.id,
                    'feature',
                  ),
                }}
                nameError={
                  duplicateNameIds.has(character.id)
                    ? GENERAL_STORY_DUPLICATE_NAME_ERROR
                    : null
                }
                onChange={({ name, gender, feature }) =>
                  update(character.id, { name, gender, feature })
                }
                nameInputRef={(element) => registerInput(character.id, element)}
              />
            </div>
          </CollapsibleListItem>
        );
      })}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="secondary"
          disabled={characters.length >= supportingMaxCount}
          onClick={add}>
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          {addSupporting}
        </Button>
      </div>
      <ConfirmAlertDialog {...dialogProps} />
    </div>
  );
}
