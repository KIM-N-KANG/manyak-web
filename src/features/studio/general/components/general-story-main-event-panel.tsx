import type { Dispatch, SetStateAction } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { CollapsibleListItem } from '@/components/common/collapsible-list-item';
import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  GENERAL_STORY_DUPLICATE_NAME_ERROR,
  GENERAL_STORY_EVENT_COPY,
} from '@/features/studio/general/constants';
import { getDuplicateNameIds } from '@/features/studio/general/utils/duplicate-name';
import {
  createMainEventDraft,
  type GeneralStoryMainEventDraft,
  hasMainEventInput,
} from '@/features/studio/general/utils/main-event-draft';
import { REGISTER_ERROR_KEY } from '@/features/studio/general/utils/register-validation';
import { useDiscardConfirm } from '@/hooks/use-discard-confirm';
import { useInputRefRegistry } from '@/hooks/use-input-ref-registry';

import { GeneralStoryInputField } from './general-story-input-field';

const {
  label,
  intro,
  maxCount,
  add,
  defaultLabel,
  name,
  description,
  keySentence,
} = GENERAL_STORY_EVENT_COPY;

const DESCRIPTION_HEIGHT = 'min-h-28 max-h-70';
const KEY_SENTENCE_HEIGHT = 'min-h-16 max-h-40';

type GeneralStoryMainEventPanelProps = {
  mainEvents: GeneralStoryMainEventDraft[];
  onChange: Dispatch<SetStateAction<GeneralStoryMainEventDraft[]>>;
};

export function GeneralStoryMainEventPanel({
  mainEvents,
  onChange,
}: GeneralStoryMainEventPanelProps) {
  const { registerInput, scrollInputIntoView } =
    useInputRefRegistry<HTMLInputElement>();
  const { request: requestDiscard, dialogProps } = useDiscardConfirm((id) =>
    onChange((previous) => previous.filter((item) => item.id !== id)),
  );
  const duplicateNameIds = getDuplicateNameIds(mainEvents);

  const update = (id: string, changes: Partial<GeneralStoryMainEventDraft>) =>
    onChange((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );

  const addMainEvent = () => {
    const next = createMainEventDraft();

    onChange((previous) => [...previous, next]);
    scrollInputIntoView(next.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field className="gap-2 px-4 pt-4">
        <FieldLabel>{label}</FieldLabel>
        <FieldDescription className="break-keep text-foreground-secondary">
          {intro}
        </FieldDescription>
      </Field>
      {mainEvents.map((mainEvent, index) => {
        const order = index + 1;
        const itemLabel = mainEvent.name.trim() || defaultLabel(order);
        const idPrefix = `general-story-event-${mainEvent.id}`;

        return (
          <CollapsibleListItem
            key={mainEvent.id}
            id={idPrefix}
            label={itemLabel}
            order={order}
            maxCount={maxCount}
            onRemove={() =>
              requestDiscard(mainEvent.id, hasMainEventInput(mainEvent))
            }>
            <div className="flex flex-col gap-6 px-4">
              <GeneralStoryInputField
                inputRef={(element) => registerInput(mainEvent.id, element)}
                id={`${idPrefix}-name`}
                label={name.label}
                required
                maxLength={name.maxLength}
                placeholder={name.placeholder}
                description={name.description}
                registerErrorKey={REGISTER_ERROR_KEY.event(
                  mainEvent.id,
                  'name',
                )}
                error={
                  duplicateNameIds.has(mainEvent.id)
                    ? GENERAL_STORY_DUPLICATE_NAME_ERROR
                    : null
                }
                value={mainEvent.name}
                onChange={(value) => update(mainEvent.id, { name: value })}
              />
              <GeneralStoryInputField
                id={`${idPrefix}-description`}
                label={description.label}
                required
                multiline
                heightClassName={DESCRIPTION_HEIGHT}
                maxLength={description.maxLength}
                placeholder={description.placeholder}
                description={description.description}
                registerErrorKey={REGISTER_ERROR_KEY.event(
                  mainEvent.id,
                  'description',
                )}
                value={mainEvent.description}
                onChange={(value) =>
                  update(mainEvent.id, { description: value })
                }
              />
              <GeneralStoryInputField
                id={`${idPrefix}-key-sentence`}
                label={keySentence.label}
                required
                multiline
                heightClassName={KEY_SENTENCE_HEIGHT}
                maxLength={keySentence.maxLength}
                placeholder={keySentence.placeholder}
                description={keySentence.description}
                registerErrorKey={REGISTER_ERROR_KEY.event(
                  mainEvent.id,
                  'keySentence',
                )}
                value={mainEvent.keySentence}
                onChange={(value) =>
                  update(mainEvent.id, { keySentence: value })
                }
              />
            </div>
          </CollapsibleListItem>
        );
      })}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="secondary"
          disabled={mainEvents.length >= maxCount}
          onClick={addMainEvent}>
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          {add}
        </Button>
      </div>
      <ConfirmAlertDialog {...dialogProps} />
    </div>
  );
}
