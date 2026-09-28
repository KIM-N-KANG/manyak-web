import {
  Field,
  FieldDescription,
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
import { cn } from '@/lib/utils';

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
              maxLength={nameMaxLength}
              placeholder={namePlaceholder}
              value={character.name}
              onChange={(event) =>
                onChange({ ...character, name: event.target.value })
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
              aria-required>
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
        <FieldDescription className="break-keep text-foreground-secondary">
          {basicInfoDescription}
        </FieldDescription>
      </Field>

      <Field className="gap-2">
        <FieldLabel htmlFor={`${idPrefix}-feature`} className="gap-0.5">
          {featureLabel}
          {featureRequired && <RequiredMark />}
        </FieldLabel>
        <InputGroup>
          <InputGroupTextarea
            id={`${idPrefix}-feature`}
            aria-required={featureRequired}
            maxLength={featureMaxLength}
            placeholder={featurePlaceholder}
            value={character.feature}
            className="max-h-70 min-h-28"
            onChange={(event) =>
              onChange({ ...character, feature: event.target.value })
            }
          />
          <InputGroupAddon align="block-end">
            <InputGroupText>
              {character.feature.length} / {featureMaxLength}
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription className="break-keep text-foreground-secondary">
          {featureDescription}
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}
