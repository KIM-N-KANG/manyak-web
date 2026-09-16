'use client';

import type { ReactNode } from 'react';

import {
  AiChat02Icon,
  AiImageIcon,
  FormIcon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

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
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';

import { CHAT_SETTINGS_COPY } from '../../constants';
import { type ChatInputMode } from '../../hooks/use-chat-input-mode';
import { ChatTurnCreditCost } from './chat-turn-credit-cost';

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
  /** 회원이면 실시간 이미지 제목 옆에 턴+이미지 합산 이프 비용을 보인다 */
  showCreditCost: boolean;
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
  showCreditCost,
}: ChatSettingsSheetProps) {
  const container = useAppFrameContainer();

  return (
    // 채팅 입력창에 포커스가 있는 채로 열리므로 키보드가 닫히며 visualViewport가 바뀐다.
    // 시트에는 입력 필드가 없으니 vaul의 키보드 대응(높이 재계산)을 끈다 — 켜 두면 시트가
    // 뷰포트 높이만큼 늘어나 아래가 비고 안쪽 스크롤이 생긴다.
    <Drawer
      open={open && container !== null}
      onOpenChange={onOpenChange}
      repositionInputs={false}>
      {/* 스크롤은 본문 래퍼가 맡는다. DrawerContent에 overflow를 주면 vaul이 러버밴드
          틈을 메우려고 아래에 깔아 둔 ::after(높이 200%)까지 스크롤 영역에 잡힌다. */}
      <DrawerContent
        container={container}
        className="absolute"
        overlayClassName="absolute">
        <DrawerHeader className="px-4 pt-4 pb-0 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
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
                showCreditCost ? (
                  <Badge variant="secondary">
                    <ChatTurnCreditCost withRealtimeImage />
                  </Badge>
                ) : null
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
    <div className="flex min-h-12 items-center gap-4 px-4 py-2">
      <HugeiconsIcon icon={icon} className="size-6" aria-hidden="true" />
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
