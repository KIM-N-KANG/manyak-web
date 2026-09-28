import type { Dispatch, SetStateAction } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { Button } from '@/components/ui/button';
import {
  GENERAL_STORY_CHARACTER_COPY,
  GENERAL_STORY_TABS,
} from '@/features/studio/general/constants';
import type { DraftImage } from '@/features/studio/general/hooks/use-draft-image-picker';
import type { GeneralStoryCharacter } from '@/features/studio/general/utils/character-settings';
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
  characters: GeneralStorySupportingCharacter[];
  onChange: Dispatch<SetStateAction<GeneralStorySupportingCharacter[]>>;
};

export function GeneralStorySupportingCharacterList({
  characters,
  onChange,
}: GeneralStorySupportingCharacterListProps) {
  const {
    supportingMaxCount,
    supportingNamePlaceholders,
    supportingFeaturePlaceholder,
    addSupporting,
    remove,
  } = GENERAL_STORY_CHARACTER_COPY;
  const canRemove = characters.length > 1;
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
          <section key={character.id} className="flex flex-col gap-4">
            <div className="flex min-h-12 items-center bg-muted px-4">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="min-w-0 truncate text-sm font-medium text-foreground-secondary">
                  {headerLabel}
                </span>
                <span className="shrink-0 rounded-full bg-border px-2 py-1 text-xs leading-none text-foreground-secondary">
                  {order}/{supportingMaxCount}
                </span>
              </div>
              {canRemove && (
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  aria-label={`${headerLabel} ${remove}`}
                  onClick={() =>
                    requestDiscard(
                      character.id,
                      Boolean(
                        character.name.trim() ||
                        character.gender ||
                        character.feature.trim() ||
                        character.image,
                      ),
                    )
                  }
                  className="w-12 justify-end rounded-none px-0 text-sm text-foreground-secondary">
                  {remove}
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-6 px-4">
              <GeneralStoryImageField
                id={`general-story-supporting-${character.id}-image`}
                label={GENERAL_STORY_CHARACTER_COPY.imageLabel}
                kind="CHARACTER"
                ratio={4 / 3}
                widthClassName="w-32"
                description={GENERAL_STORY_CHARACTER_COPY.imageDescription}
                ariaLabelPrefix={labelPrefix}
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
                featureRequired={false}
                onChange={({ name, gender, feature }) =>
                  update(character.id, { name, gender, feature })
                }
                nameInputRef={(element) => registerInput(character.id, element)}
              />
            </div>
          </section>
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
