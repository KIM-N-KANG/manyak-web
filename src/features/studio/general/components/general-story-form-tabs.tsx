import { type ReactNode, useRef, useState } from 'react';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { FieldGroup } from '@/components/ui/field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GENERAL_STORY_COVER_COPY,
  GENERAL_STORY_CREATE_COPY,
  GENERAL_STORY_TABS,
  GENERAL_STORY_TEXT_FIELDS,
  type GeneralStoryTab,
  type GeneralStoryTextField,
} from '@/features/studio/general/constants';
import type { DraftImage } from '@/features/studio/general/hooks/use-draft-image-picker';
import { getGeneralStoryTextError } from '@/features/studio/general/utils/general-story-text-error';
import { cn } from '@/lib/utils';

import { GeneralStoryImageField } from './general-story-image-field';
import { GeneralStoryInputField } from './general-story-input-field';
import { GeneralStoryLengthRatioField } from './general-story-length-ratio-field';

export type GeneralStoryTextValues = Record<GeneralStoryTextField, string>;

/**
 * 여러 줄 입력의 최소·최대 높이다. 글 길이에 맞춰 늘다가 최대 높이부터는 칸 안에서 스크롤한다.
 * 없는 항목은 `min-h-24`만 쓴다.
 */
const TEXTAREA_HEIGHT: Partial<Record<GeneralStoryTextField, string>> = {
  oneLineIntro: 'min-h-16 max-h-40',
  world: 'min-h-40 max-h-90',
  progression: 'min-h-28 max-h-70',
};

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
  const [isTouched, setIsTouched] = useState(false);

  return (
    <GeneralStoryInputField
      id={`general-story-${field}`}
      label={config.label}
      required
      multiline={config.multiline}
      heightClassName={TEXTAREA_HEIGHT[field]}
      maxLength={'maxLength' in config ? config.maxLength : undefined}
      placeholder={'placeholder' in config ? config.placeholder : undefined}
      description={'description' in config ? config.description : undefined}
      error={isTouched ? getGeneralStoryTextError(field, value) : null}
      value={value}
      onChange={onChange}
      onBlur={() => setIsTouched(true)}
    />
  );
}

type GeneralStoryFormTabsProps = {
  values: GeneralStoryTextValues;
  onChange: (field: GeneralStoryTextField, value: string) => void;
  cover: DraftImage | null;
  onCoverChange: (cover: DraftImage | null) => void;
  descriptionRatio: number;
  onDescriptionRatioChange: (descriptionRatio: number) => void;
  /** 글 항목 대신 직접 그리는 탭 내용이다. */
  panels: Partial<Record<GeneralStoryTab, ReactNode>>;
};

export function GeneralStoryFormTabs({
  values,
  onChange,
  cover,
  onCoverChange,
  descriptionRatio,
  onDescriptionRatioChange,
  panels,
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
        className="relative min-h-0 flex-1 scroll-fade-b overflow-y-auto overscroll-contain">
        {GENERAL_STORY_TABS.map(({ value, fields }) => (
          <TabsContent
            key={value}
            value={value}
            className={cn(
              'flex min-h-full flex-col p-4',
              (value === 'supporting' || value === 'start') && 'px-0 pt-0',
            )}>
            {panels[value] ??
              (fields.length === 0 ? (
                <EmptyListNotice>
                  {GENERAL_STORY_CREATE_COPY.preparing}
                </EmptyListNotice>
              ) : (
                <FieldGroup className="gap-6">
                  {value === 'basic' && (
                    <GeneralStoryImageField
                      id="general-story-cover"
                      label={GENERAL_STORY_COVER_COPY.label}
                      kind="COVER"
                      ratio={3 / 4}
                      widthClassName="w-32"
                      ratioHint={GENERAL_STORY_COVER_COPY.description}
                      image={cover}
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
                  {value === 'story' && (
                    <GeneralStoryLengthRatioField
                      descriptionRatio={descriptionRatio}
                      onChange={onDescriptionRatioChange}
                    />
                  )}
                </FieldGroup>
              ))}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
