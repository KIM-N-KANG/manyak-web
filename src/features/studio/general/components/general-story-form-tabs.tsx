import { useRef, useState } from 'react';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
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
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GENERAL_STORY_CREATE_COPY,
  GENERAL_STORY_TABS,
  GENERAL_STORY_TEXT_FIELDS,
  type GeneralStoryTab,
  type GeneralStoryTextField,
} from '@/features/studio/general/constants';
import { getGeneralStoryTextError } from '@/features/studio/general/utils/general-story-text-error';

import {
  type GeneralStoryCover,
  GeneralStoryCoverField,
} from './general-story-cover-field';

export type GeneralStoryTextValues = Record<GeneralStoryTextField, string>;

type GeneralStoryTextInputProps = {
  field: GeneralStoryTextField;
  value: string;
  onChange: (value: string) => void;
};

function GeneralStoryTextInput({
  field,
  value,
  onChange,
}: GeneralStoryTextInputProps) {
  const config = GENERAL_STORY_TEXT_FIELDS[field];
  const maxLength = 'maxLength' in config ? config.maxLength : undefined;
  const placeholder = 'placeholder' in config ? config.placeholder : undefined;
  const description = 'description' in config ? config.description : undefined;
  const id = `general-story-${field}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const [isTouched, setIsTouched] = useState(false);
  const error = isTouched ? getGeneralStoryTextError(field, value) : null;
  const describedBy = error ? errorId : description ? descriptionId : undefined;
  const controlProps = {
    id,
    value,
    maxLength,
    placeholder,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    onBlur: () => setIsTouched(true),
    'aria-required': true,
  };

  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id} className="gap-0.5">
        {config.label}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      </FieldLabel>
      <InputGroup>
        {config.multiline ? (
          <InputGroupTextarea
            {...controlProps}
            className="min-h-24"
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <InputGroupInput
            {...controlProps}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {maxLength !== undefined && (
          <InputGroupAddon
            align={config.multiline ? 'block-end' : 'inline-end'}>
            <InputGroupText>
              {value.length} / {maxLength}
            </InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : (
        description && (
          <FieldDescription
            id={descriptionId}
            className="text-foreground-secondary">
            {description}
          </FieldDescription>
        )
      )}
    </Field>
  );
}

type GeneralStoryFormTabsProps = {
  values: GeneralStoryTextValues;
  onChange: (field: GeneralStoryTextField, value: string) => void;
  cover: GeneralStoryCover | null;
  onCoverChange: (cover: GeneralStoryCover | null) => void;
};

export function GeneralStoryFormTabs({
  values,
  onChange,
  cover,
  onCoverChange,
}: GeneralStoryFormTabsProps) {
  const [tab, setTab] = useState<GeneralStoryTab>(GENERAL_STORY_TABS[0].value);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (value: GeneralStoryTab) => {
    setTab(value);
    scrollAreaRef.current?.scrollTo({ top: 0 });
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => handleTabChange(value as GeneralStoryTab)}
      className="min-h-0 flex-1 gap-0">
      <TabsList
        variant="line"
        className="relative scrollbar-none w-full shrink-0 justify-start gap-0 overflow-x-auto overscroll-x-contain p-0 shadow-[inset_0_-1px_0_var(--color-border)]">
        {GENERAL_STORY_TABS.map(({ value, label, required }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="h-full flex-auto gap-0.5 rounded-none border-0 py-0 after:bottom-0!"
            onClick={(event) =>
              event.currentTarget.scrollIntoView({
                block: 'nearest',
                inline: 'center',
                behavior: 'smooth',
              })
            }>
            {label}
            {required && (
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      <div
        ref={scrollAreaRef}
        className="min-h-0 flex-1 scroll-fade-b overflow-y-auto overscroll-contain">
        {GENERAL_STORY_TABS.map(({ value, fields }) => (
          <TabsContent
            key={value}
            value={value}
            className="flex min-h-full flex-col p-4">
            {fields.length === 0 ? (
              <EmptyListNotice>
                {GENERAL_STORY_CREATE_COPY.preparing}
              </EmptyListNotice>
            ) : (
              <FieldGroup className="gap-6">
                {value === 'basic' && (
                  <GeneralStoryCoverField
                    cover={cover}
                    onChange={onCoverChange}
                  />
                )}
                {fields.map((field) => (
                  <GeneralStoryTextInput
                    key={field}
                    field={field}
                    value={values[field]}
                    onChange={(value) => onChange(field, value)}
                  />
                ))}
              </FieldGroup>
            )}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
