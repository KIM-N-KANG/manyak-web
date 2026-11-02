import { type ReactNode, useId, useState } from 'react';

import {
  ArrowDown01Icon,
  PlusSignIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AnimatePresence,
  m,
  type Transition,
  useReducedMotion,
} from 'motion/react';

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
                onToggle={() => toggle('persona')}
                footer={
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
                }>
                <div
                  role="radiogroup"
                  aria-label={PERSONA_SELECT_COPY.title}
                  className="flex flex-col gap-1">
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
                    aria-label={CHAT_START_SHEET_COPY.startSetting}
                    className="flex flex-col gap-1">
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

/** 항목을 펼치고 접을 때 높이가 튀지 않고 멈추는 스프링. 공용 접이식 목록 항목과 같은 값이다. */
const EXPAND_TRANSITION: Transition = {
  type: 'spring',
  bounce: 0,
  visualDuration: 0.3,
};

/** 높이 0에서 내용 높이로 펼쳐지며 나타나고 거꾸로 접히며 사라지는 모션이다. */
const COLLAPSE_MOTION_PROPS = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

/**
 * 펼친 목록이 5줄 반 남짓으로 잘려 고른 항목이 아래에 숨으면, 그 항목이 목록 가운데 오도록 스크롤한다.
 *
 * @param list 펼친 목록의 스크롤 요소
 */
const revealCheckedOption = (list: HTMLDivElement | null) => {
  const checked = list?.querySelector<HTMLElement>('[aria-checked="true"]');

  if (!list || !checked) return;

  list.scrollTo({
    top: checked.offsetTop - (list.clientHeight - checked.offsetHeight) / 2,
  });
};

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
  /** 펼친 목록 아래에 스크롤과 상관없이 고정해 두는 동작이다. */
  footer?: ReactNode;
};

function ChoiceSection({
  label,
  value,
  detail,
  expanded,
  expandable = true,
  onToggle,
  children,
  footer,
}: ChoiceSectionProps) {
  const panelId = useId();
  const transition = useReducedMotion() ? { duration: 0 } : EXPAND_TRANSITION;
  const summary = (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-foreground-secondary">{label}</span>
        <AnimatePresence initial={false}>
          {!expanded && (
            <m.span
              key="value"
              className="flex flex-col gap-1 overflow-hidden"
              transition={transition}
              {...COLLAPSE_MOTION_PROPS}>
              <span className="pt-1 text-base font-semibold wrap-anywhere">
                {value}
              </span>
              {detail && (
                <span className="line-clamp-2 text-sm text-foreground-secondary">
                  {detail}
                </span>
              )}
            </m.span>
          )}
        </AnimatePresence>
      </span>
      {expandable && (
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          aria-hidden="true"
          className={cn(
            'size-5 shrink-0 text-foreground-secondary transition-transform duration-300 ease-out motion-reduce:transition-none',
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
      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            key="panel"
            id={panelId}
            className="overflow-hidden"
            transition={transition}
            {...COLLAPSE_MOTION_PROPS}>
            <div
              ref={revealCheckedOption}
              className={cn(
                'relative flex max-h-71 scroll-fade-b flex-col overflow-y-auto overscroll-contain px-2',
                footer ? 'pb-1' : 'pb-2',
              )}>
              {children}
            </div>
            {footer && (
              <div className="flex flex-col gap-1 px-2 pb-2">
                <div aria-hidden="true" className="mx-2 h-px bg-border" />
                {footer}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
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
      className={cn(OPTION_CLASS_NAME, checked && 'bg-foreground/5')}
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
