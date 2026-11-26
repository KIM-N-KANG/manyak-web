'use client';

import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { ConfirmAlertDialog } from '@/components/common/confirm-alert-dialog';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { useDiscardConfirm } from '@/hooks/use-discard-confirm';
import { cn } from '@/lib/utils';

import { INPUT_BLOCK_LABELS, INPUT_BLOCK_PLACEHOLDERS } from '../../constants';
import { type InputBlock, type InputBlockType } from '../../utils/input-blocks';
import { submitOnShortcut } from '../../utils/submit-shortcut';
import { ChatSettingsButton } from './chat-settings-sheet';
import { ChatTurnCostInfo } from './chat-turn-cost-info';
import { LockedInputOverlay } from './locked-input-overlay';
import { SendButtonIcon } from './send-button-icon';

type ChatBlockInputProps = {
  blocks: InputBlock[];
  onAddBlock: (type: InputBlockType) => void;
  /** 블럭을 지운다. 내용이 있는 블럭은 확인 창을 거친 뒤에만 호출된다. */
  onRemoveBlock: (id: string) => void;
  onUpdateBlock: (id: string, value: string) => void;
  /** 블럭의 textarea를 ID로 등록한다. 새로 추가한 블럭에 포커스를 옮기는 데 쓴다. */
  onRegisterInput: (id: string, element: HTMLTextAreaElement | null) => void;
  /** 입력이 있을 때 블럭을 직렬화해 전송한다. */
  onSend: () => void;
  /** 공백이 아닌 추천 입력이 하나라도 있는지. 빈 입력에서 랜덤 전송을 허용하는 조건이다. */
  hasSuggestions: boolean;
  /** 입력이 비었을 때 전송 버튼이 대신 호출한다. 추천 입력 하나를 골라 바로 보낸다. */
  onSendRandomSuggestion: () => void;
  /** 응답 생성 중이면 입력과 블럭 버튼을 잠그고 전송을 막는다. */
  isStreaming: boolean;
  /** 선택지 설정. 꺼져 있으면 빈 입력의 랜덤 전송을 쓰지 않는다. */
  choicesEnabled: boolean;
  onOpenSettings: () => void;
  /** 실시간 이미지가 켜져 있으면 비용 배지에 이미지 비용을 합산한다 */
  realtimeImageEnabled: boolean;
  /** 고른 채팅 모델의 턴 이프 비용(모르면 undefined) */
  turnCost: number | undefined;
  /** 지금 적용 중인 모델 코드(모르면 undefined). 비용 안내에 모델 이름을 보인다 */
  modelCode: string | undefined;
  /** 이 채팅의 긴 응답 설정. 비용 안내에 함께 보인다 */
  longResponse: boolean;
  /** 응답 생성 중 잠긴 입력창을 눌렀을 때 호출된다 */
  onLockedTap: () => void;
};

/**
 * 상황과 대사 블럭을 따로 적는 블럭 입력 모드의 입력창.
 *
 * @remarks
 * 입력이 하나라도 있으면 블럭을 전송하고, 모두 비었으면서 선택지가 켜져 있으면 전송 버튼이 추천 입력 랜덤
 * 전송으로 바뀐다. 내용이 있는 블럭을 지울 때만 확인 창을 띄운다.
 */
export function ChatBlockInput({
  blocks,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlock,
  onRegisterInput,
  onSend,
  hasSuggestions,
  onSendRandomSuggestion,
  isStreaming,
  choicesEnabled,
  onOpenSettings,
  realtimeImageEnabled,
  turnCost,
  modelCode,
  longResponse,
  onLockedTap,
}: ChatBlockInputProps) {
  const { request: requestDiscard, dialogProps } =
    useDiscardConfirm(onRemoveBlock);

  const hasInput = blocks.some((block) => block.value.trim().length > 0);
  const canSend =
    !isStreaming && (hasInput || (choicesEnabled && hasSuggestions));
  const showsRandomSend = !hasInput && choicesEnabled;

  const handleSend = () => {
    if (hasInput) {
      onSend();

      return;
    }

    onSendRandomSuggestion();
  };

  const requestRemoveBlock = (block: InputBlock) =>
    requestDiscard(block.id, block.value.trim().length > 0);

  return (
    <section className="flex flex-col bg-background pb-[env(safe-area-inset-bottom)]">
      {blocks.length > 0 && (
        <div className="flex max-h-[30dvh] flex-col gap-2 overflow-y-auto overscroll-contain px-4 py-2">
          {blocks.map((block) => (
            <div key={block.id} className="flex items-center gap-1">
              <InputGroup>
                <LockedInputOverlay locked={isStreaming} onTap={onLockedTap} />
                <InputGroupAddon>
                  <span
                    className={cn(
                      'text-xs',
                      block.type === 'situation'
                        ? 'text-foreground-secondary'
                        : 'text-foreground',
                    )}>
                    {INPUT_BLOCK_LABELS[block.type]}
                  </span>
                </InputGroupAddon>
                <InputGroupTextarea
                  ref={(element) => onRegisterInput(block.id, element)}
                  value={block.value}
                  rows={1}
                  placeholder={INPUT_BLOCK_PLACEHOLDERS[block.type]}
                  disabled={isStreaming}
                  onChange={(event) =>
                    onUpdateBlock(block.id, event.target.value)
                  }
                  onKeyDown={(event) =>
                    submitOnShortcut(event, canSend, handleSend)
                  }
                  className={cn(
                    'max-h-[4lh] resize-none py-2.25',
                    block.type === 'situation'
                      ? 'text-foreground-secondary'
                      : 'text-foreground',
                  )}
                />
              </InputGroup>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="입력 삭제"
                disabled={isStreaming}
                tabIndex={-1}
                onClick={() => requestRemoveBlock(block)}
                className="shrink-0 text-foreground-secondary">
                <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 p-4 pt-0">
        <Button
          type="button"
          aria-label="상황 묘사 추가"
          data-tour="add-situation"
          size="sm"
          variant="secondary"
          disabled={isStreaming}
          onClick={() => onAddBlock('situation')}>
          상황 추가
        </Button>
        <Button
          type="button"
          aria-label="대사 추가"
          data-tour="add-dialogue"
          size="sm"
          variant="secondary"
          disabled={isStreaming}
          onClick={() => onAddBlock('dialogue')}>
          대사 추가
        </Button>
        <ChatSettingsButton onClick={onOpenSettings} />
        <div className="ml-auto flex items-center gap-1">
          <ChatTurnCostInfo
            withRealtimeImage={realtimeImageEnabled}
            turnCost={turnCost}
            modelCode={modelCode}
            longResponse={longResponse}
          />
          <Button
            type="button"
            size="icon-sm"
            aria-label={showsRandomSend ? '추천 입력 랜덤 전송' : '전송'}
            data-tour="send"
            disabled={!canSend}
            onClick={handleSend}>
            <SendButtonIcon
              isStreaming={isStreaming}
              showsRandomSend={showsRandomSend}
            />
          </Button>
        </div>
      </div>

      <ConfirmAlertDialog {...dialogProps} />
    </section>
  );
}
