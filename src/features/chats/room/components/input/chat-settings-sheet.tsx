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
import {
  getTrialRemaining,
  showsTrialRemaining,
} from '@/features/auth/_shared/utils/guest-trial';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { useTrials } from '@/hooks/use-trials';
import { cn } from '@/lib/utils';

import {
  buildChatTurnCreditCostLabel,
  buildTrialRemainingLabel,
  CHAT_SETTINGS_COPY,
  formatTrialRemaining,
} from '../../constants';
import { type ChatInputMode } from '../../hooks/use-chat-input-mode';
import { isTrialFree } from '../../utils/chat-turn-cost';

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
  choicesEnabled: boolean;
  onChoicesEnabledChange: (enabled: boolean) => void;
  mode: ChatInputMode;
  onModeChange: (mode: ChatInputMode) => void;
  /** 회원 여부. 이미지 체험을 다 쓴 회원에게만 이미지 소모 이프와 환불 안내를 보인다 */
  isMember: boolean;
};

/** 채팅 기능·입력 모드 스위치를 담은 채팅 설정 바텀 시트. */
export function ChatSettingsSheet({
  open,
  onOpenChange,
  realtimeImageEnabled,
  onRealtimeImageEnabledChange,
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
  // 게스트는 이미지 체험이 남아 있으면 정가에 취소선을 긋고 적용가 0을 보인다.
  const showsImageStrike = !isMember && isTrialFree(imageRemaining);

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
                isMember && showsTrialRemaining(isMember, imageRemaining) ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-foreground-secondary',
                      imageRemaining === undefined && 'animate-pulse',
                    )}>
                    {buildTrialRemainingLabel(
                      formatTrialRemaining(imageRemaining),
                    )}
                  </Badge>
                ) : (
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
                          (!isMember && imageRemaining === undefined)) &&
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
                )
              }
              checked={realtimeImageEnabled}
              onCheckedChange={onRealtimeImageEnabledChange}
            />
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
};

/** 마이 페이지 메뉴 항목과 같은 배치(아이콘·라벨·설명)에 오른쪽 스위치를 둔 설정 행. */
function SettingRow({
  icon,
  copy,
  titleAddon,
  checked,
  onCheckedChange,
}: SettingRowProps) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-4 py-2">
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
    </div>
  );
}
