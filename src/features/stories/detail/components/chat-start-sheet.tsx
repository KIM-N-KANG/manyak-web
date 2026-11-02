import { type ReactNode, useId, useState } from 'react';

import {
  ArrowDown01Icon,
  PlusSignIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { StoryStartSettingResponse } from '@/api/generated/models';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { LoginRequiredSheet } from '@/features/auth/_shared/components/login-required-sheet';
import { parseChatMessageSegments } from '@/features/chats/_shared/utils/chat-message-segments';
import { useStartChat } from '@/features/stories/_shared/hooks/use-start-chat';
import { clearCreatedPersona } from '@/features/stories/_shared/utils/created-persona-selection';
import {
  CHAT_START_SHEET_COPY,
  PERSONA_SELECT_COPY,
} from '@/features/stories/detail/constants/start-setting-copy';
import { useDetailPersonas } from '@/features/stories/detail/hooks/use-detail-personas';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

import { startSettingLabel, startSettingValue } from './story-start-settings';

type ChatStartSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  startSettings: StoryStartSettingResponse[];
  /** 고른 시작 설정의 Select 값. 상세 본문의 Select와 같은 상태다. */
  selectedStartSetting: string;
  onSelectedStartSettingChange: (value: string) => void;
  /** 고른 페르소나 ID. null이면 기본 주인공이다. */
  personaId: string | null;
  onPersonaIdChange: (personaId: string | null) => void;
};

export function ChatStartSheet({
  open,
  onOpenChange,
  storyId,
  startSettings,
  selectedStartSetting,
  onSelectedStartSettingChange,
  personaId,
  onPersonaIdChange,
}: ChatStartSheetProps) {
  const container = useAppFrameContainer();
  const [expanded, setExpanded] = useState<'persona' | 'startSetting' | null>(
    null,
  );
  const { personas, createPersona, isLoginOpen, setIsLoginOpen } =
    useDetailPersonas(storyId);

  const settingIndex = startSettings.findIndex(
    (setting, index) =>
      startSettingValue(setting, index) === selectedStartSetting,
  );
  const setting = startSettings[settingIndex];
  const situationPreview = parseChatMessageSegments(
    setting?.startSituation ?? '',
  )
    .flatMap((segment) => (segment.type === 'text' ? [segment.content] : []))
    .join(' ');
  const personaName =
    personas.find(({ id }) => id === personaId)?.name ??
    PERSONA_SELECT_COPY.defaultProtagonist;

  const { startChat, isStarting } = useStartChat(storyId, {
    startSettingId: setting?.id,
    personaId,
    onStart: () => {
      clearCreatedPersona();
      track('client_storyDetail_chatStartButton_clicked', {
        story_id: storyId,
        persona_type: personaId ? 'persona' : 'default',
      });
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next && isStarting) {
      return;
    }

    if (!next) {
      setExpanded(null);
    }

    onOpenChange(next);
  };

  const toggle = (key: 'persona' | 'startSetting') =>
    setExpanded((current) => (current === key ? null : key));

  const selectPersona = (next: string | null) => {
    setExpanded(null);
    onPersonaIdChange(next);
  };

  const selectStartSetting = (next: string) => {
    setExpanded(null);
    onSelectedStartSettingChange(next);
  };

  return (
    <>
      <Drawer
        open={open && container !== null}
        disablePointerDismissal={isStarting}
        onOpenChange={handleOpenChange}>
        <DrawerContent container={container}>
          <DrawerHeader className="gap-1 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
            <DrawerTitle className="text-xl leading-snug font-bold">
              {CHAT_START_SHEET_COPY.title}
            </DrawerTitle>
            <DrawerDescription className="text-foreground-secondary">
              {CHAT_START_SHEET_COPY.description}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain px-4 pt-6 pb-4">
            <div className="flex flex-col divide-y divide-background overflow-hidden rounded-xl bg-muted">
              <ChoiceSection
                label={PERSONA_SELECT_COPY.title}
                value={personaName}
                expanded={expanded === 'persona'}
                onToggle={() => toggle('persona')}>
                <div role="radiogroup" aria-label={PERSONA_SELECT_COPY.title}>
                  <ChoiceOption
                    checked={personaId === null}
                    onSelect={() => selectPersona(null)}>
                    {PERSONA_SELECT_COPY.defaultProtagonist}
                  </ChoiceOption>
                  {personas.map((persona) =>
                    persona.id ? (
                      <ChoiceOption
                        key={persona.id}
                        checked={persona.id === personaId}
                        onSelect={() => selectPersona(persona.id ?? null)}>
                        {persona.name}
                      </ChoiceOption>
                    ) : null,
                  )}
                </div>
                <button
                  type="button"
                  className={OPTION_CLASS_NAME}
                  onClick={() => createPersona({ fromStartSheet: true })}>
                  <HugeiconsIcon
                    icon={PlusSignIcon}
                    aria-hidden="true"
                    className="size-5 shrink-0 text-foreground-secondary"
                  />
                  <span className="flex-1 text-foreground-secondary">
                    {PERSONA_SELECT_COPY.create}
                  </span>
                </button>
              </ChoiceSection>

              {setting && (
                <ChoiceSection
                  label={CHAT_START_SHEET_COPY.startSetting}
                  value={startSettingLabel(setting, settingIndex)}
                  detail={situationPreview}
                  expanded={expanded === 'startSetting'}
                  expandable={startSettings.length > 1}
                  onToggle={() => toggle('startSetting')}>
                  <div
                    role="radiogroup"
                    aria-label={CHAT_START_SHEET_COPY.startSetting}>
                    {startSettings.map((option, index) => {
                      const value = startSettingValue(option, index);

                      return (
                        <ChoiceOption
                          key={value}
                          checked={value === selectedStartSetting}
                          onSelect={() => selectStartSetting(value)}>
                          {startSettingLabel(option, index)}
                        </ChoiceOption>
                      );
                    })}
                  </div>
                </ChoiceSection>
              )}
            </div>
          </div>

          <div className="shrink-0 px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              type="button"
              size="lg"
              className="relative w-full"
              aria-busy={isStarting}
              disabled={isStarting}
              onClick={startChat}>
              <LoadingButtonContent
                isLoading={isStarting}
                loadingLabel="새 채팅 시작 중">
                {CHAT_START_SHEET_COPY.start}
              </LoadingButtonContent>
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
      <LoginRequiredSheet open={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </>
  );
}

const OPTION_CLASS_NAME =
  'flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-3 text-left text-base outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5';

type ChoiceSectionProps = {
  label: string;
  value: string;
  /** 접힌 상태에서 값 아래 두 줄까지 보이는 설명이다. */
  detail?: string;
  expanded: boolean;
  /** 거짓이면 고를 값이 하나뿐이라 펼치지 않는다. */
  expandable?: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function ChoiceSection({
  label,
  value,
  detail,
  expanded,
  expandable = true,
  onToggle,
  children,
}: ChoiceSectionProps) {
  const panelId = useId();
  const summary = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm text-foreground-secondary">{label}</span>
        {!expanded && (
          <span className="text-base font-semibold wrap-anywhere">{value}</span>
        )}
        {!expanded && detail && (
          <span className="line-clamp-2 text-sm text-foreground-secondary">
            {detail}
          </span>
        )}
      </span>
      {expandable && (
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          aria-hidden="true"
          className={cn(
            'size-5 shrink-0 text-foreground-secondary transition-transform duration-200',
            expanded && 'rotate-180',
          )}
        />
      )}
    </>
  );

  return (
    <section>
      {expandable ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex w-full items-center gap-3 p-4 text-left outline-none focus-visible:bg-foreground/5"
          onClick={onToggle}>
          {summary}
        </button>
      ) : (
        <div className="flex items-center gap-3 p-4">{summary}</div>
      )}
      {expanded && (
        <div
          id={panelId}
          className="flex animate-in flex-col px-2 pb-2 duration-200 fade-in-0">
          {children}
        </div>
      )}
    </section>
  );
}

type ChoiceOptionProps = {
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
};

function ChoiceOption({ checked, onSelect, children }: ChoiceOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn(OPTION_CLASS_NAME, checked && 'font-semibold text-primary')}
      onClick={onSelect}>
      <span className="min-w-0 flex-1 wrap-anywhere">{children}</span>
      {checked && (
        <HugeiconsIcon
          icon={Tick02Icon}
          strokeWidth={2}
          aria-hidden="true"
          className="size-5 shrink-0"
        />
      )}
    </button>
  );
}
