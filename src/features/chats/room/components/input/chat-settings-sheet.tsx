'use client';

import { type ReactNode, useRef } from 'react';

import {
  AiChat02Icon,
  AiImageIcon,
  FormIcon,
  InformationCircleIcon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';

import { CreditMark } from '@/components/common/credit-mark';
import { Switch } from '@/components/motion/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatCreditAmount } from '@/constants/credit';
import { getTrialRemaining } from '@/features/auth/_shared/utils/guest-trial';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { useTrials } from '@/hooks/use-trials';
import { cn } from '@/lib/utils';

import {
  buildChatTurnCreditCostLabel,
  CHAT_SETTINGS_COPY,
} from '../../constants';
import { type ChatInputMode } from '../../hooks/use-chat-input-mode';
import { isTrialFree } from '../../utils/chat-turn-cost';

/** 딤이 천천히 내려앉고 걷히도록 양끝을 부드럽게 늦추는 곡선. */
const NUDGE_EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

/** 드로어 전환과 같은 감속 곡선. 카드가 나타나는 흐름을 시트와 같은 결로 맞춘다. */
const NUDGE_EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** 시트가 자리를 잡은 뒤 화면 전체에 딤을 천천히 깐다. */
const NUDGE_DIM_MOTION = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { delay: 0.3, duration: 0.55, ease: NUDGE_EASE_IN_OUT },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: NUDGE_EASE_IN_OUT },
  },
};

/**
 * 딤이 반쯤 내려앉을 즈음 안내 카드를 하이라이트 바로 아래에서 띄운다.
 * 위치는 튀지 않는 스프링으로 끝까지 감속하고, 동작 줄이기에서는 투명도만 바꾼다.
 *
 * @param reduceMotion 동작 줄이기 설정 여부
 * @returns 안내 카드의 등장·퇴장 모션
 */
function nudgeCardMotion(reduceMotion: boolean) {
  const settle = {
    type: 'spring',
    bounce: 0,
    duration: 0.75,
    delay: 0.5,
  } as const;

  return {
    initial: {
      opacity: 0,
      y: reduceMotion ? 0 : 12,
      scale: reduceMotion ? 1 : 0.98,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        opacity: { delay: 0.5, duration: 0.45, ease: NUDGE_EASE_OUT },
        y: settle,
        scale: settle,
      },
    },
    exit: {
      opacity: 0,
      y: reduceMotion ? 0 : 4,
      transition: { duration: 0.2, ease: NUDGE_EASE_IN_OUT },
    },
  };
}

type ChatSettingsButtonProps = {
  onClick: () => void;
};

/** 입력 툴바의 설정 아이콘 버튼. 시트 자체는 입력 모드 전환에도 살아남도록 상위가 소유한다. */
export function ChatSettingsButton({ onClick }: ChatSettingsButtonProps) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      aria-label={CHAT_SETTINGS_COPY.trigger}
      data-tour="chat-settings"
      onClick={onClick}>
      <HugeiconsIcon icon={Settings01Icon} aria-hidden="true" />
    </Button>
  );
}

type ChatSettingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  realtimeImageEnabled: boolean;
  onRealtimeImageEnabledChange: (enabled: boolean) => void;
  /** 실시간 이미지 항목만 밝혀 두고 나머지를 어둡게 덮어 켜고 끄는 방법을 안내한다 */
  highlightsRealtimeImage?: boolean;
  /** 안내 카드의 확인이나 어두운 영역을 눌러 안내를 닫을 때 호출된다 */
  onHighlightDismiss?: () => void;
  choicesEnabled: boolean;
  onChoicesEnabledChange: (enabled: boolean) => void;
  mode: ChatInputMode;
  onModeChange: (mode: ChatInputMode) => void;
  /** 회원 여부. 이미지 체험을 다 쓴 회원에게만 이미지 소모 이프와 환불 안내를 보인다 */
  isMember: boolean;
};

export function ChatSettingsSheet({
  open,
  onOpenChange,
  realtimeImageEnabled,
  onRealtimeImageEnabledChange,
  highlightsRealtimeImage = false,
  onHighlightDismiss,
  choicesEnabled,
  onChoicesEnabledChange,
  mode,
  onModeChange,
  isMember,
}: ChatSettingsSheetProps) {
  const container = useAppFrameContainer();
  const sheetRef = useRef<HTMLDivElement>(null);
  const chatImageCost = useCreditPolicy()?.chatImageCost;
  const imageRemaining = getTrialRemaining(useTrials(), 'chatImage');
  const showsImageStrike = isTrialFree(imageRemaining);
  const reduceMotion = useReducedMotion();

  return (
    <Drawer open={open && container !== null} onOpenChange={onOpenChange}>
      {/* 스크롤은 본문 래퍼가 맡는다. 팝업 자체에 overflow를 주면 아래 틈을 메우는
          bleed(::after)까지 스크롤 영역에 잡힌다. */}
      <DrawerContent ref={sheetRef} container={container}>
        <DrawerHeader className="px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold">
            {CHAT_SETTINGS_COPY.title}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-col gap-8 overflow-y-auto overscroll-contain pt-8 pb-4">
          <section className="flex flex-col">
            <div className="mb-2 px-4">
              <Label>{CHAT_SETTINGS_COPY.groups.features}</Label>
            </div>
            <SettingRow
              icon={AiImageIcon}
              copy={CHAT_SETTINGS_COPY.realtimeImage}
              titleAddon={
                <>
                  {/* 팝오버는 시트 안으로 포탈한다. body로 나가면 드로어가 바깥 탭으로 보고 시트를 닫는다. */}
                  {isMember && (
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={
                              CHAT_SETTINGS_COPY.realtimeImage.noticeLabel
                            }
                            className="-ml-1.5 text-foreground-secondary"
                          />
                        }>
                        <HugeiconsIcon
                          icon={InformationCircleIcon}
                          className="size-4"
                          aria-hidden="true"
                        />
                      </PopoverTrigger>
                      <PopoverContent
                        container={sheetRef}
                        side="bottom"
                        align="start"
                        className="w-auto max-w-64 gap-0 border border-border bg-input px-3 py-2 shadow-xs ring-0">
                        {CHAT_SETTINGS_COPY.realtimeImage.notice}
                      </PopoverContent>
                    </Popover>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn(
                      'gap-1 text-foreground-secondary',
                      (chatImageCost === undefined ||
                        imageRemaining === undefined) &&
                        'animate-pulse',
                    )}>
                    <CreditMark className="size-3" />
                    {showsImageStrike && (
                      <s>{formatCreditAmount(chatImageCost)}</s>
                    )}
                    <span>
                      {buildChatTurnCreditCostLabel(
                        formatCreditAmount(
                          showsImageStrike ? 0 : chatImageCost,
                        ),
                      )}
                    </span>
                  </Badge>
                </>
              }
              checked={realtimeImageEnabled}
              onCheckedChange={onRealtimeImageEnabledChange}
              className="z-20 mx-2 rounded-md bg-popover px-2">
              <AnimatePresence>
                {highlightsRealtimeImage && (
                  <m.div
                    {...nudgeCardMotion(reduceMotion === true)}
                    className="absolute top-full left-0 mt-3 flex w-72 origin-top flex-col gap-1 rounded-md bg-background p-4 shadow-lg">
                    <p className="font-semibold">
                      {CHAT_SETTINGS_COPY.realtimeImage.nudge.title}
                    </p>
                    <p className="text-sm break-keep text-foreground-secondary">
                      {CHAT_SETTINGS_COPY.realtimeImage.nudge.description}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 self-end"
                      onClick={onHighlightDismiss}>
                      {CHAT_SETTINGS_COPY.realtimeImage.nudge.confirm}
                    </Button>
                  </m.div>
                )}
              </AnimatePresence>
            </SettingRow>
            <SettingRow
              icon={AiChat02Icon}
              copy={CHAT_SETTINGS_COPY.choices}
              checked={choicesEnabled}
              onCheckedChange={onChoicesEnabledChange}
            />
          </section>
          <section className="flex flex-col">
            <div className="mb-2 px-4">
              <Label>{CHAT_SETTINGS_COPY.groups.inputMode}</Label>
            </div>
            <SettingRow
              icon={FormIcon}
              copy={CHAT_SETTINGS_COPY.blockInput}
              checked={mode === 'block'}
              onCheckedChange={(checked) =>
                onModeChange(checked ? 'block' : 'plain')
              }
            />
          </section>
        </div>
        <AnimatePresence>
          {highlightsRealtimeImage && (
            <m.div
              aria-hidden="true"
              {...NUDGE_DIM_MOTION}
              className="absolute inset-x-0 -top-[100dvh] -bottom-(--bleed) z-10 bg-black/50"
              onClick={onHighlightDismiss}
            />
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  );
}

type SettingRowProps = {
  icon: IconSvgElement;
  copy: { label: string; description: string };
  /** 라벨 오른쪽에 붙는 보조 표시(비용 배지 등) */
  titleAddon?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  /** 행 아래에 붙는 안내 카드 등 행을 기준으로 배치할 요소 */
  children?: ReactNode;
};

function SettingRow({
  icon,
  copy,
  titleAddon,
  checked,
  onCheckedChange,
  className,
  children,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-12 items-center gap-3 px-4 py-2',
        className,
      )}>
      <HugeiconsIcon icon={icon} className="size-5" aria-hidden="true" />
      <span className="flex flex-1 flex-col text-left text-base">
        <span className="flex items-center gap-2">
          {copy.label}
          {titleAddon}
        </span>
        <span className="text-xs text-foreground-secondary">
          {copy.description}
        </span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        ariaLabel={copy.label}
      />
      {children}
    </div>
  );
}
