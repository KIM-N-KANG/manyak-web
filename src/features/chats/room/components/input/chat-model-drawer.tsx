'use client';

import { useState } from 'react';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { cn } from '@/lib/utils';

import { CHAT_MODEL_COPY } from '../../constants';
import { ChatTurnCreditCost } from './chat-turn-credit-cost';

type ChatModelDrawerProps = {
  /** 지금 적용 중인 모델이 고급인지 여부 */
  advancedModel: boolean;
  /** 모델 항목을 누르면 호출된다. 시트는 먼저 닫힌다 */
  onSelect: (advancedModel: boolean) => void;
  /** 실시간 이미지가 켜져 있으면 비용에 이미지 비용을 합산한다 */
  withRealtimeImage: boolean;
};

export function ChatModelDrawer({
  advancedModel,
  onSelect,
  withRealtimeImage,
}: ChatModelDrawerProps) {
  const container = useAppFrameContainer();
  const [isOpen, setIsOpen] = useState(false);
  const current = advancedModel
    ? CHAT_MODEL_COPY.advanced
    : CHAT_MODEL_COPY.basic;

  const handleSelect = (next: boolean) => {
    setIsOpen(false);
    onSelect(next);
  };

  return (
    <Drawer open={isOpen && container !== null} onOpenChange={setIsOpen}>
      <DrawerTrigger
        render={<Button type="button" variant="secondary" size="sm" />}>
        <span className="sr-only">{CHAT_MODEL_COPY.trigger}</span>
        {current.label}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          data-icon="inline-end"
          className="text-foreground-secondary"
          aria-hidden="true"
        />
      </DrawerTrigger>
      <DrawerContent container={container}>
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold">
            {CHAT_MODEL_COPY.title}
          </DrawerTitle>
          <DrawerDescription>{CHAT_MODEL_COPY.description}</DrawerDescription>
        </DrawerHeader>
        <div
          role="radiogroup"
          aria-label={CHAT_MODEL_COPY.title}
          className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pt-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <ChatModelOption
            copy={CHAT_MODEL_COPY.basic}
            advancedModel={false}
            checked={!advancedModel}
            withRealtimeImage={withRealtimeImage}
            onSelect={handleSelect}
          />
          <ChatModelOption
            copy={CHAT_MODEL_COPY.advanced}
            advancedModel
            checked={advancedModel}
            withRealtimeImage={withRealtimeImage}
            onSelect={handleSelect}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

type ChatModelOptionProps = {
  copy: { label: string; description: string };
  advancedModel: boolean;
  checked: boolean;
  withRealtimeImage: boolean;
  onSelect: (advancedModel: boolean) => void;
};

function ChatModelOption({
  copy,
  advancedModel,
  checked,
  withRealtimeImage,
  onSelect,
}: ChatModelOptionProps) {
  // label의 relative는 sr-only 라디오의 위치 기준을 칸 안에 묶는다.
  // 이미 고른 칸을 눌러도 시트가 닫히도록 change 대신 click을 받는다.
  return (
    <label
      className={cn(
        'relative flex cursor-pointer flex-col gap-1 rounded-xl border border-border bg-input p-4 transition-[border-color,background-color,box-shadow] has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
        checked && 'border-primary bg-primary/20',
      )}>
      <input
        type="radio"
        name="chat-model"
        checked={checked}
        readOnly
        onClick={() => onSelect(advancedModel)}
        className="sr-only"
      />
      <span className="flex items-center gap-2 font-bold">
        {copy.label}
        <ChatTurnCreditCost
          withRealtimeImage={withRealtimeImage}
          advancedModel={advancedModel}
        />
      </span>
      <span className="text-sm text-foreground-secondary">
        {copy.description}
      </span>
    </label>
  );
}
