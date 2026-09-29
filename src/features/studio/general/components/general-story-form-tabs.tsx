import {
  type ReactNode,
  type Ref,
  use,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { useCollapsedListItems } from '@/components/common/collapsible-list-item';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { StepFooter } from '@/components/common/step-footer';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GENERAL_STORY_COVER_COPY,
  GENERAL_STORY_CREATE_COPY,
  GENERAL_STORY_REGISTER_ERROR_COPY,
  GENERAL_STORY_TABS,
  GENERAL_STORY_TEXT_FIELDS,
  type GeneralStoryTab,
  type GeneralStoryTextField,
} from '@/features/studio/general/constants';
import type { DraftImage } from '@/features/studio/general/hooks/use-draft-image-picker';
import {
  type GeneralStoryRegisterError,
  REGISTER_ERROR_KEY,
} from '@/features/studio/general/utils/register-validation';
import { cn } from '@/lib/utils';

import { GeneralStoryImageField } from './general-story-image-field';
import { GeneralStoryInputField } from './general-story-input-field';
import { GeneralStoryLengthRatioField } from './general-story-length-ratio-field';
import { GeneralStoryRegisterErrorsContext } from './general-story-register-errors';

/** 접힌 항목을 펼치는 애니메이션이 끝날 만큼 기다리는 시간이다. */
const EXPAND_SETTLE_MS = 400;

export type GeneralStoryTextValues = Record<GeneralStoryTextField, string>;

/** 폼 밖에서 오류 칸을 보여 줄 때 쓰는 핸들이다. */
export type GeneralStoryFormTabsHandle = {
  /** 탭 순서상 첫 오류 탭으로 옮겨 접힌 항목을 펼치고 첫 오류 칸으로 스크롤한다. */
  revealErrors: (errors: GeneralStoryRegisterError[]) => void;
};

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

  return (
    <GeneralStoryInputField
      id={`general-story-${field}`}
      registerErrorKey={REGISTER_ERROR_KEY.text(field)}
      label={config.label}
      required
      multiline={config.multiline}
      heightClassName={TEXTAREA_HEIGHT[field]}
      maxLength={'maxLength' in config ? config.maxLength : undefined}
      placeholder={'placeholder' in config ? config.placeholder : undefined}
      description={'description' in config ? config.description : undefined}
      value={value}
      onChange={onChange}
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
  /** 지금 입력의 칸별 등록 오류다. 등록하기를 누르면 첫 오류 탭과 칸으로 옮긴다. */
  registerErrors: GeneralStoryRegisterError[];
  /** 등록하기를 누를 때마다 호출한다. 이때부터 탭과 칸에 오류를 표시한다. */
  onRegisterAttempt: () => void;
  /** 오류 없이 등록하기를 눌렀을 때 호출한다. */
  onRegister?: () => void;
  /** 등록 요청·검토 중이면 등록하기에 스피너를 두고 탭과 입력을 잠근다. */
  isRegistering?: boolean;
  /** 다른 탭으로 옮길 때마다 호출한다(탭 누르기·이전·다음·등록 오류 이동). */
  onTabChange?: () => void;
  /** 처음 여는 탭이다. 없으면 첫 탭이다. */
  initialTab?: GeneralStoryTab;
  ref?: Ref<GeneralStoryFormTabsHandle>;
};

export function GeneralStoryFormTabs({
  values,
  onChange,
  cover,
  onCoverChange,
  descriptionRatio,
  onDescriptionRatioChange,
  panels,
  registerErrors,
  onRegisterAttempt,
  onRegister,
  isRegistering = false,
  onTabChange,
  initialTab = GENERAL_STORY_TABS[0].value,
  ref,
}: GeneralStoryFormTabsProps) {
  const shownRegisterErrors = use(GeneralStoryRegisterErrorsContext);
  const { setCollapsed } = useCollapsedListItems();
  const [tab, setTab] = useState<GeneralStoryTab>(initialTab);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabIndex = GENERAL_STORY_TABS.findIndex(({ value }) => value === tab);
  const previousTab = GENERAL_STORY_TABS[tabIndex - 1]?.value;
  const nextTab = GENERAL_STORY_TABS[tabIndex + 1]?.value;

  const handleTabChange = (value: GeneralStoryTab) => {
    if (value !== tab) onTabChange?.();

    setTab(value);
    scrollAreaRef.current?.scrollTo({ top: 0 });
  };

  const handleRegister = () => {
    onRegisterAttempt();

    if (registerErrors.length === 0) {
      onRegister?.();

      return;
    }

    revealErrors(registerErrors);
  };

  const revealErrors = (errors: GeneralStoryRegisterError[]) => {
    const [firstError] = errors;

    if (!firstError) return;

    const collapsibleIds = new Set(
      errors.flatMap(({ collapsibleId }) =>
        collapsibleId ? [collapsibleId] : [],
      ),
    );

    collapsibleIds.forEach((id) => setCollapsed(id, false));
    moveToTab(firstError.tab);
    // 탭 전환과 펼침이 그려진 뒤, 펼침 애니메이션이 끝나 위치가 굳으면 첫 오류 칸으로 스크롤한다.
    setTimeout(
      () =>
        scrollAreaRef.current
          ?.querySelector('[aria-invalid="true"], [data-register-error]')
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
      collapsibleIds.size > 0 ? EXPAND_SETTLE_MS : 0,
    );
  };

  useImperativeHandle(ref, () => ({ revealErrors }));

  /** 하단 버튼으로 탭을 옮길 때도 탭을 누른 것처럼 새 탭을 탭 줄 가운데로 스크롤한다. */
  const moveToTab = (value: GeneralStoryTab) => {
    handleTabChange(value);
    tabListRef.current
      ?.querySelector(`[data-tab-value="${value}"]`)
      ?.scrollIntoView({
        block: 'nearest',
        inline: 'center',
        behavior: 'smooth',
      });
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => handleTabChange(value as GeneralStoryTab)}
      className="min-h-0 flex-1 gap-0">
      <TabsList
        ref={tabListRef}
        inert={isRegistering}
        variant="line"
        className="relative scrollbar-none w-full shrink-0 justify-start gap-0 overflow-x-auto overscroll-x-contain p-0 shadow-[inset_0_-1px_0_var(--color-border)]">
        {GENERAL_STORY_TABS.map(({ value, label, required }) => {
          const hasError = Boolean(
            shownRegisterErrors?.some(
              ({ tab: errorTab }) => errorTab === value,
            ),
          );

          return (
            <TabsTrigger
              key={value}
              value={value}
              data-tab-value={value}
              data-invalid={hasError || undefined}
              className={cn(
                'h-full flex-auto gap-0.5 rounded-none border-0 py-0 after:bottom-0!',
                hasError &&
                  'text-destructive hover:text-destructive dark:text-destructive dark:hover:text-destructive data-active:text-destructive dark:data-active:text-destructive',
              )}
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
              {hasError && (
                <span className="sr-only">
                  {GENERAL_STORY_REGISTER_ERROR_COPY.invalidTab}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
      <div
        ref={scrollAreaRef}
        inert={isRegistering}
        className="relative min-h-0 flex-1 scroll-fade-b overflow-y-auto overscroll-contain">
        {GENERAL_STORY_TABS.map(({ value, fields }) => (
          <TabsContent
            key={value}
            value={value}
            className={cn(
              'flex min-h-full flex-col p-4',
              (value === 'supporting' ||
                value === 'start' ||
                value === 'event') &&
                'px-0 pt-0',
            )}>
            {panels[value] ?? (
              <FieldGroup className="gap-6">
                {value === 'basic' && (
                  <GeneralStoryImageField
                    id="general-story-cover"
                    label={GENERAL_STORY_COVER_COPY.label}
                    kind="COVER"
                    ratio={3 / 4}
                    widthClassName="w-32"
                    ratioHint={GENERAL_STORY_COVER_COPY.description}
                    registerErrorKey={REGISTER_ERROR_KEY.cover}
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
            )}
          </TabsContent>
        ))}
      </div>
      <StepFooter>
        {previousTab && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={isRegistering}
            onClick={() => moveToTab(previousTab)}>
            {GENERAL_STORY_CREATE_COPY.previous}
          </Button>
        )}
        {nextTab ? (
          <Button type="button" size="lg" onClick={() => moveToTab(nextTab)}>
            {GENERAL_STORY_CREATE_COPY.next}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={isRegistering}
            className={cn('relative', isRegistering && 'disabled:opacity-100')}
            onClick={handleRegister}>
            <LoadingButtonContent
              isLoading={isRegistering}
              loadingLabel={GENERAL_STORY_CREATE_COPY.registering}>
              {GENERAL_STORY_CREATE_COPY.register}
            </LoadingButtonContent>
          </Button>
        )}
      </StepFooter>
    </Tabs>
  );
}
