'use client';

import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { useGetModels } from '@/api/generated/endpoints/chats/chats';
import { CreditMark } from '@/components/common/credit-mark';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatCreditAmount } from '@/constants/credit';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { getTrialRemaining } from '@/features/auth/_shared/utils/guest-trial';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { useTrials } from '@/hooks/use-trials';
import { cn } from '@/lib/utils';

import {
  buildChatTurnCreditCostLabel,
  CHAT_TRIAL_MODEL_CODE,
  CHAT_TURN_COST_INFO_COPY as COPY,
} from '../../constants';
import { calcChatTurnCost, isTrialFree } from '../../utils/chat-turn-cost';
import { ChatTurnCreditCost } from './chat-turn-credit-cost';

type ChatTurnCostInfoProps = {
  /** 고른 채팅 모델의 턴 이프 비용(모르면 undefined) */
  turnCost: number | undefined;
  /** 지금 적용 중인 모델 코드(모르면 undefined) */
  modelCode: string | undefined;
  /** 실시간 이미지가 켜져 있으면 이미지 비용을 합산한다 */
  withRealtimeImage: boolean;
};

/**
 * 전송 버튼 왼쪽의 한 턴 비용 버튼. 누르면 항목별 비용과 남은 무료 체험을 팝오버로 보인다.
 * 비용 계산은 버튼 배지와 같은 규칙(calcChatTurnCost)을 항목별로 풀어 보인다.
 */
export function ChatTurnCostInfo({
  turnCost,
  modelCode,
  withRealtimeImage,
}: ChatTurnCostInfoProps) {
  const trials = useTrials();
  const policy = useCreditPolicy();
  const { isMember } = useMemberAccess();
  const { data: modelsData } = useGetModels();
  const models = modelsData?.status === 200 ? modelsData.data : [];
  const modelName = models.find((model) => model.code === modelCode)?.name;
  const trialModelName = models.find(
    (model) => model.code === CHAT_TRIAL_MODEL_CODE,
  )?.name;
  const turnRemaining = getTrialRemaining(trials, 'chatTurn');
  const imageRemaining = getTrialRemaining(trials, 'chatImage');
  const { full, discounted } = calcChatTurnCost({
    turnCost,
    chatImageCost: policy?.chatImageCost,
    withRealtimeImage,
    turnRemaining,
    imageRemaining,
  });
  const showsStrike =
    full !== undefined && discounted !== undefined && discounted < full;
  const showsTrialModelNote =
    isMember &&
    isTrialFree(turnRemaining) &&
    modelCode !== CHAT_TRIAL_MODEL_CODE &&
    trialModelName !== undefined;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="-mr-1 gap-1 px-1.5 text-foreground-secondary"
          />
        }>
        <span className="sr-only">{COPY.trigger}</span>
        <ChatTurnCreditCost
          turnCost={turnCost}
          withRealtimeImage={withRealtimeImage}
        />
        <HugeiconsIcon
          icon={InformationCircleIcon}
          className="size-3.5"
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-64 gap-3">
        <PopoverTitle className="font-semibold">{COPY.title}</PopoverTitle>
        {/* 영수증처럼 항목을 먼저 적고 구분선 아래에 합계를 둔다. */}
        <dl className="flex flex-col gap-3">
          <CostRow
            label={COPY.turn}
            detail={modelName}
            cost={turnCost}
            remaining={turnRemaining}
          />
          {withRealtimeImage && (
            <CostRow
              label={COPY.realtimeImage}
              cost={policy?.chatImageCost}
              remaining={imageRemaining}
            />
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <dt className="text-sm">{COPY.total}</dt>
            <dd
              className={cn(
                'flex items-center gap-1 font-bold tabular-nums',
                discounted === undefined && 'animate-pulse',
              )}>
              <CreditMark className="size-4" />
              {showsStrike && (
                <s className="text-sm font-normal text-foreground-tertiary">
                  {formatCreditAmount(full)}
                </s>
              )}
              {buildChatTurnCreditCostLabel(formatCreditAmount(discounted))}
            </dd>
          </div>
        </dl>
        {showsTrialModelNote && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-foreground-secondary">
            {COPY.buildTrialModelNote(trialModelName)}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

type CostRowProps = {
  label: string;
  /** 라벨 옆 보조 표시(모델 이름 등) */
  detail?: string;
  /** 항목 정가(모르면 undefined) */
  cost: number | undefined;
  /** 항목 체험 잔여(응답 전 undefined, 무제한 null) */
  remaining: number | null | undefined;
};

/**
 * 비용 내역 한 줄. 라벨 아래에 남은 무료 체험을 적고, 체험이 남은 항목은 정가에 취소선을 긋고 0을 보인다.
 * 체험 줄은 무료로 적용되면 프라이머리, 다 썼으면 옅은 글씨로 금액과 이어 읽히게 한다.
 */
function CostRow({ label, detail, cost, remaining }: CostRowProps) {
  const free = isTrialFree(remaining);

  let trialText: string | undefined;

  if (remaining === null) trialText = COPY.trialUnlimited;
  else if (remaining === 0) trialText = COPY.trialExhausted;
  else if (remaining !== undefined)
    trialText = COPY.buildTrialRemaining(remaining);

  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex min-w-0 flex-col">
        <span className="flex gap-1.5 text-sm">
          {label}
          {detail && (
            <span className="truncate text-foreground-secondary">{detail}</span>
          )}
        </span>
        {trialText && (
          <span
            className={cn(
              'text-xs',
              free ? 'text-primary' : 'text-foreground-tertiary',
            )}>
            {trialText}
          </span>
        )}
      </dt>
      <dd
        className={cn(
          'flex shrink-0 items-center gap-1 text-sm tabular-nums',
          (cost === undefined || remaining === undefined) && 'animate-pulse',
        )}>
        {free && (
          <s className="text-foreground-tertiary">{formatCreditAmount(cost)}</s>
        )}
        {buildChatTurnCreditCostLabel(formatCreditAmount(free ? 0 : cost))}
      </dd>
    </div>
  );
}
