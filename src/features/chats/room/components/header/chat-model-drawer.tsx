'use client';

import { useState } from 'react';

import { ArrowDown01Icon, RulerIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { ChatModelResponse } from '@/api/generated/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { cn } from '@/lib/utils';

import {
  CHAT_LONG_RESPONSE_ENABLED_STORAGE_KEY,
  CHAT_MODEL_COPY,
} from '../../constants';
import { useStoredToggle } from '../../hooks/use-stored-toggle';
import { SettingRow } from '../input/chat-settings-sheet';
import { ChatTurnCreditCost } from '../input/chat-turn-credit-cost';

type ChatModelDrawerProps = {
  /** 서버가 노출 순서대로 준 채팅 모델 목록 */
  models: ChatModelResponse[];
  /** 지금 적용 중인 모델 코드 */
  modelCode: string;
  /** 모델 항목을 누르면 호출된다. 시트는 먼저 닫힌다 */
  onSelect: (modelCode: string) => void;
  /** 실시간 이미지가 켜져 있으면 비용에 이미지 비용을 합산한다 */
  withRealtimeImage: boolean;
};

export function ChatModelDrawer({
  models,
  modelCode,
  onSelect,
  withRealtimeImage,
}: ChatModelDrawerProps) {
  const container = useAppFrameContainer();
  const [isOpen, setIsOpen] = useState(false);
  const current = models.find((model) => model.code === modelCode);
  const { enabled: longResponseEnabled, setEnabled: setLongResponseEnabled } =
    useStoredToggle(CHAT_LONG_RESPONSE_ENABLED_STORAGE_KEY, false);

  const handleSelect = (next: string) => {
    setIsOpen(false);
    onSelect(next);
  };

  return (
    <Drawer open={isOpen && container !== null} onOpenChange={setIsOpen}>
      <DrawerTrigger render={<Button type="button" variant="secondary" />}>
        <span className="sr-only">{CHAT_MODEL_COPY.trigger}</span>
        {current?.name}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          data-icon="inline-end"
          className="text-foreground-secondary"
          aria-hidden="true"
        />
      </DrawerTrigger>
      <DrawerContent container={container}>
        <DrawerHeader className="px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold">
            {CHAT_MODEL_COPY.title}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex min-h-0 flex-col gap-8 overflow-y-auto overscroll-contain pt-8 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <section className="flex flex-col">
            <div className="mb-2 px-4">
              <Label>{CHAT_MODEL_COPY.group}</Label>
            </div>
            <div
              role="radiogroup"
              aria-label={CHAT_MODEL_COPY.group}
              className="flex flex-col gap-2 px-4">
              {models.map((model) => (
                <ChatModelOption
                  key={model.code}
                  model={model}
                  checked={model.code === modelCode}
                  withRealtimeImage={withRealtimeImage}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </section>
          {/* 긴 응답은 채팅 설정처럼 바로 반영되고 시트는 열린 채 남는다. */}
          <section className="flex flex-col">
            <div className="mb-2 px-4">
              <Label>{CHAT_MODEL_COPY.responseLength.group}</Label>
            </div>
            <SettingRow
              icon={RulerIcon}
              copy={CHAT_MODEL_COPY.responseLength}
              checked={longResponseEnabled}
              onCheckedChange={setLongResponseEnabled}
            />
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

type ChatModelOptionProps = {
  model: ChatModelResponse;
  checked: boolean;
  withRealtimeImage: boolean;
  onSelect: (modelCode: string) => void;
};

function ChatModelOption({
  model,
  checked,
  withRealtimeImage,
  onSelect,
}: ChatModelOptionProps) {
  const description =
    model.code === undefined
      ? undefined
      : CHAT_MODEL_COPY.optionDescriptions[model.code];

  return (
    <label
      className={cn(
        'relative flex cursor-pointer flex-col gap-1 rounded-xl border border-border bg-input p-4 transition-[border-color,background-color,box-shadow] has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
        checked && 'border-primary bg-primary/20',
      )}>
      {/* label의 relative가 sr-only 라디오를 칸 안에 묶고, 이미 고른 칸을 눌러도 시트가 닫히도록 change 대신 click을 받는다. */}
      <input
        type="radio"
        name="chat-model"
        checked={checked}
        readOnly
        onClick={() => {
          if (model.code !== undefined) onSelect(model.code);
        }}
        className="sr-only"
      />
      <span className="flex items-center gap-2 font-bold">
        {model.name}
        {/* 고른 칸의 연한 프라이머리 배경 위에서는 회색 캡슐이 탁해 보여, 배경색 캡슐에 프라이머리 글씨로 바꾼다. */}
        <Badge
          variant="secondary"
          className={cn(
            'text-foreground-secondary',
            checked && 'bg-background text-primary [&_s]:text-primary/60',
          )}>
          <ChatTurnCreditCost
            turnCost={model.turnCost}
            withRealtimeImage={withRealtimeImage}
            className="text-inherit"
          />
        </Badge>
      </span>
      {description && (
        <span className="text-sm text-foreground-secondary">{description}</span>
      )}
    </label>
  );
}
