import {
  type Dispatch,
  type SetStateAction,
  use,
  useRef,
  useState,
} from 'react';

import { Cancel01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { CollapsibleListItem } from '@/components/common/collapsible-list-item';
import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { Button } from '@/components/ui/button';
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
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { ToggleChip } from '@/components/ui/toggle-chip';
import {
  GENERAL_STORY_DUPLICATE_NAME_ERROR,
  GENERAL_STORY_START_COPY,
} from '@/features/studio/general/constants';
import { getDuplicateNameIds } from '@/features/studio/general/utils/duplicate-name';
import { getMinLengthError } from '@/features/studio/general/utils/general-story-text-error';
import { REGISTER_ERROR_KEY } from '@/features/studio/general/utils/register-validation';
import {
  createEndingDraft,
  createStartSettingDraft,
  type GeneralStoryEndingDraft,
  type GeneralStoryStartSettingDraft,
  getStartSettingLabel,
  hasEndingInput,
  hasStartSettingInput,
  normalizeMinTurns,
} from '@/features/studio/general/utils/start-setting-draft';
import { useDiscardConfirm } from '@/hooks/use-discard-confirm';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import { useInputRefRegistry } from '@/hooks/use-input-ref-registry';
import { cn } from '@/lib/utils';

import { GeneralStoryInputField } from './general-story-input-field';
import { GeneralStoryRegisterErrorsContext } from './general-story-register-errors';

const {
  maxCount,
  chipLabelMaxLength,
  groupLabel,
  defaultLabel,
  add,
  remove,
  name,
  prologue,
  situation,
  suggestedInput,
  ending,
} = GENERAL_STORY_START_COPY;

/** 기본 선택 칩 모양에서 모서리만 알약 모양으로 둔다. */
const CHIP_CLASS_NAME = 'shrink-0 rounded-full';

/** 선택한 시작 상황 칩은 프라이머리로 채우고 라벨을 온 프라이머리로 둔다. */
const SELECTED_CHIP_CLASS_NAME =
  'aria-pressed:bg-primary aria-pressed:text-primary-foreground';

const LONG_TEXT_HEIGHT = 'min-h-28 max-h-70';
const SHORT_TEXT_HEIGHT = 'min-h-16 max-h-40';
const SUGGESTED_INPUT_HEIGHT = 'min-h-12 max-h-40';

type GeneralStoryStartSettingPanelProps = {
  startSettings: GeneralStoryStartSettingDraft[];
  onChange: Dispatch<SetStateAction<GeneralStoryStartSettingDraft[]>>;
};

export function GeneralStoryStartSettingPanel({
  startSettings,
  onChange,
}: GeneralStoryStartSettingPanelProps) {
  const [selectedId, setSelectedId] = useState(startSettings[0]?.id);
  const chipRowRef = useRef<HTMLDivElement>(null);
  const dragScrollProps = useDragScroll();
  const registerErrors = use(GeneralStoryRegisterErrorsContext);
  const selectedIndex = Math.max(
    0,
    startSettings.findIndex(({ id }) => id === selectedId),
  );
  const selected = startSettings[selectedIndex];

  const addStartSetting = () => {
    const next = createStartSettingDraft();

    onChange((previous) => [...previous, next]);
    setSelectedId(next.id);
    requestAnimationFrame(() =>
      chipRowRef.current
        ?.querySelector(`[data-start-setting-id="${next.id}"]`)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        }),
    );
  };

  const removeStartSetting = (removedId: string) => {
    const removedIndex = startSettings.findIndex(({ id }) => id === removedId);

    onChange((previous) => previous.filter(({ id }) => id !== removedId));

    if (removedId === selected.id) {
      setSelectedId(startSettings[removedIndex - 1]?.id);
    }
  };

  const {
    request: requestDiscardStartSetting,
    dialogProps: startSettingDialogProps,
  } = useDiscardConfirm(removeStartSetting);

  return (
    <div className="flex flex-col">
      <div
        ref={chipRowRef}
        {...dragScrollProps}
        role="group"
        aria-label={groupLabel}
        className="scrollbar-none flex gap-2 overflow-x-auto overscroll-x-contain px-4 pt-4 pb-2">
        {startSettings.map((item, index) => {
          const label = getStartSettingLabel(
            item.name,
            defaultLabel(index + 1),
            chipLabelMaxLength,
          );
          const isRemovable = index > 0;
          const hasRegisterError = Boolean(
            registerErrors?.some(
              ({ startSettingId }) => startSettingId === item.id,
            ),
          );

          return (
            <div
              key={item.id}
              data-start-setting-id={item.id}
              className="group relative shrink-0">
              <ToggleChip
                data-register-error={hasRegisterError || undefined}
                className={cn(
                  CHIP_CLASS_NAME,
                  SELECTED_CHIP_CLASS_NAME,
                  isRemovable && 'pr-9.5',
                  hasRegisterError && 'text-destructive',
                )}
                pressed={item.id === selected.id}
                onPressedChange={(pressed) => {
                  if (pressed) {
                    setSelectedId(item.id);
                  }
                }}>
                {label}
              </ToggleChip>
              {isRemovable && (
                <button
                  type="button"
                  aria-label={`${label} ${remove}`}
                  onClick={() =>
                    requestDiscardStartSetting(
                      item.id,
                      hasStartSettingInput(item),
                    )
                  }
                  className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-foreground-secondary outline-none group-has-aria-pressed:text-primary-foreground hover:bg-foreground/10 group-has-aria-pressed:hover:bg-primary-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/50">
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    aria-hidden="true"
                    className="size-4"
                  />
                </button>
              )}
            </div>
          );
        })}
        <Button
          type="button"
          variant="secondary"
          className={CHIP_CLASS_NAME}
          disabled={startSettings.length >= maxCount}
          onClick={addStartSetting}>
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          {add}
        </Button>
      </div>
      <GeneralStoryStartSettingEditor
        key={selected.id}
        startSetting={selected}
        onChange={onChange}
      />
      <ConfirmAlertDialog {...startSettingDialogProps} />
    </div>
  );
}

type GeneralStoryStartSettingEditorProps = {
  startSetting: GeneralStoryStartSettingDraft;
  onChange: Dispatch<SetStateAction<GeneralStoryStartSettingDraft[]>>;
};

function GeneralStoryStartSettingEditor({
  startSetting: selected,
  onChange,
}: GeneralStoryStartSettingEditorProps) {
  const { registerInput, scrollInputIntoView } =
    useInputRefRegistry<HTMLInputElement>();

  const update = (changes: Partial<GeneralStoryStartSettingDraft>) =>
    onChange((previous) =>
      previous.map((item) =>
        item.id === selected.id ? { ...item, ...changes } : item,
      ),
    );

  const updateEnding = (
    endingId: string,
    changes: Partial<GeneralStoryEndingDraft>,
  ) =>
    onChange((previous) =>
      previous.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              endings: item.endings.map((endingItem) =>
                endingItem.id === endingId
                  ? { ...endingItem, ...changes }
                  : endingItem,
              ),
            }
          : item,
      ),
    );

  const { request: requestDiscardEnding, dialogProps: endingDialogProps } =
    useDiscardConfirm((endingId) =>
      onChange((previous) =>
        previous.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                endings: item.endings.filter(({ id }) => id !== endingId),
              }
            : item,
        ),
      ),
    );

  const duplicateEndingIds = getDuplicateNameIds(selected.endings);
  const [touchedSuggestedInputs, setTouchedSuggestedInputs] = useState([
    false,
    false,
    false,
  ]);
  const registerErrors = use(GeneralStoryRegisterErrorsContext);
  const suggestedInputErrors = selected.suggestedInputs.map(
    (value, index) =>
      registerErrors?.find(
        ({ key }) => key === REGISTER_ERROR_KEY.suggested(selected.id, index),
      )?.message ??
      (touchedSuggestedInputs[index]
        ? getMinLengthError(suggestedInput.label, value)
        : null),
  );
  const suggestedInputError =
    suggestedInputErrors.find((error) => error !== null) ?? null;
  const suggestedInputErrorId = `general-story-start-${selected.id}-suggested-input-error`;

  const addEnding = () => {
    const next = createEndingDraft();

    update({ endings: [...selected.endings, next] });
    scrollInputIntoView(next.id);
  };

  return (
    <>
      <FieldGroup className="gap-6 px-4 pt-2">
        <GeneralStoryInputField
          id={`general-story-start-${selected.id}-name`}
          label={name.label}
          required
          maxLength={name.maxLength}
          placeholder={name.placeholder}
          description={name.description}
          registerErrorKey={REGISTER_ERROR_KEY.start(selected.id, 'name')}
          value={selected.name}
          onChange={(value) => update({ name: value })}
        />
        <GeneralStoryInputField
          id={`general-story-start-${selected.id}-prologue`}
          label={prologue.label}
          required
          multiline
          heightClassName={LONG_TEXT_HEIGHT}
          maxLength={prologue.maxLength}
          placeholder={prologue.placeholder}
          description={prologue.description}
          registerErrorKey={REGISTER_ERROR_KEY.start(selected.id, 'prologue')}
          value={selected.prologue}
          onChange={(value) => update({ prologue: value })}
        />
        <GeneralStoryInputField
          id={`general-story-start-${selected.id}-situation`}
          label={situation.label}
          required
          multiline
          heightClassName={LONG_TEXT_HEIGHT}
          maxLength={situation.maxLength}
          placeholder={situation.placeholder}
          description={situation.description}
          registerErrorKey={REGISTER_ERROR_KEY.start(selected.id, 'situation')}
          value={selected.situation}
          onChange={(value) => update({ situation: value })}
        />

        <Field className="gap-2">
          <FieldLabel className="gap-0.5">
            {suggestedInput.label}
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </FieldLabel>
          {selected.suggestedInputs.map((value, index) => {
            const hasError = suggestedInputErrors[index] !== null;

            return (
              <InputGroup key={index}>
                <InputGroupTextarea
                  aria-label={`${suggestedInput.label} ${index + 1}`}
                  aria-required
                  aria-invalid={hasError ? true : undefined}
                  aria-describedby={
                    hasError ? suggestedInputErrorId : undefined
                  }
                  maxLength={suggestedInput.maxLength}
                  placeholder={suggestedInput.placeholders[index]}
                  value={value}
                  className={SUGGESTED_INPUT_HEIGHT}
                  onChange={(event) => {
                    const next = [...selected.suggestedInputs] as [
                      string,
                      string,
                      string,
                    ];

                    next[index] = event.target.value;
                    update({ suggestedInputs: next });
                  }}
                  onBlur={() =>
                    setTouchedSuggestedInputs((previous) =>
                      previous.map((touched, touchedIndex) =>
                        touchedIndex === index ? true : touched,
                      ),
                    )
                  }
                />
                <InputGroupAddon align="block-end">
                  <InputGroupText>
                    {value.length} / {suggestedInput.maxLength}
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            );
          })}
          {suggestedInputError ? (
            <FieldError id={suggestedInputErrorId}>
              {suggestedInputError}
            </FieldError>
          ) : (
            <FieldDescription className="break-keep text-foreground-secondary">
              {suggestedInput.description}
            </FieldDescription>
          )}
        </Field>

        <Field className="gap-2">
          <FieldLabel>{ending.label}</FieldLabel>
          <FieldDescription className="break-keep text-foreground-secondary">
            {ending.description}
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div className="mt-4 flex flex-col gap-4">
        {selected.endings.map((endingItem, index) => {
          const endingLabel =
            endingItem.name.trim() || ending.defaultLabel(index + 1);
          const idPrefix = `general-story-ending-${endingItem.id}`;

          return (
            <CollapsibleListItem
              key={endingItem.id}
              id={idPrefix}
              label={endingLabel}
              order={index + 1}
              maxCount={ending.maxCount}
              onRemove={() =>
                requestDiscardEnding(endingItem.id, hasEndingInput(endingItem))
              }>
              <FieldGroup className="gap-6 px-4">
                <GeneralStoryInputField
                  inputRef={(element) => registerInput(endingItem.id, element)}
                  id={`${idPrefix}-name`}
                  label={ending.name.label}
                  required
                  maxLength={ending.name.maxLength}
                  placeholder={ending.name.placeholder}
                  description={ending.name.description}
                  registerErrorKey={REGISTER_ERROR_KEY.ending(
                    endingItem.id,
                    'name',
                  )}
                  error={
                    duplicateEndingIds.has(endingItem.id)
                      ? GENERAL_STORY_DUPLICATE_NAME_ERROR
                      : null
                  }
                  value={endingItem.name}
                  onChange={(value) =>
                    updateEnding(endingItem.id, { name: value })
                  }
                />
                <GeneralStoryInputField
                  id={`${idPrefix}-min-turns`}
                  label={ending.minTurns.label}
                  required
                  inputMode="numeric"
                  suffix={ending.minTurns.unit}
                  placeholder={ending.minTurns.placeholder}
                  description={ending.minTurns.description}
                  registerErrorKey={REGISTER_ERROR_KEY.ending(
                    endingItem.id,
                    'minTurns',
                  )}
                  value={endingItem.minTurns}
                  onChange={(value) =>
                    updateEnding(endingItem.id, {
                      minTurns: normalizeMinTurns(value, ending.minTurns.max),
                    })
                  }
                />
                <GeneralStoryInputField
                  id={`${idPrefix}-condition`}
                  label={ending.condition.label}
                  required
                  multiline
                  heightClassName={SHORT_TEXT_HEIGHT}
                  maxLength={ending.condition.maxLength}
                  placeholder={ending.condition.placeholder}
                  description={ending.condition.description}
                  registerErrorKey={REGISTER_ERROR_KEY.ending(
                    endingItem.id,
                    'condition',
                  )}
                  value={endingItem.condition}
                  onChange={(value) =>
                    updateEnding(endingItem.id, { condition: value })
                  }
                />
                <GeneralStoryInputField
                  id={`${idPrefix}-epilogue`}
                  label={ending.epilogue.label}
                  required
                  multiline
                  heightClassName={SHORT_TEXT_HEIGHT}
                  maxLength={ending.epilogue.maxLength}
                  placeholder={ending.epilogue.placeholder}
                  description={ending.epilogue.description}
                  registerErrorKey={REGISTER_ERROR_KEY.ending(
                    endingItem.id,
                    'epilogue',
                  )}
                  value={endingItem.epilogue}
                  onChange={(value) =>
                    updateEnding(endingItem.id, { epilogue: value })
                  }
                />
              </FieldGroup>
            </CollapsibleListItem>
          );
        })}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            disabled={selected.endings.length >= ending.maxCount}
            onClick={addEnding}>
            <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
            {ending.add}
          </Button>
        </div>
      </div>
      <ConfirmAlertDialog {...endingDialogProps} />
    </>
  );
}
