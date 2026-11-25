'use client';

import { type SubmitEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from '@/components/ui/input-group';

import { submitOnShortcut } from '../../utils/submit-shortcut';
import { ChatSettingsButton } from './chat-settings-sheet';
import { ChatTurnCostInfo } from './chat-turn-cost-info';
import { LockedInputOverlay } from './locked-input-overlay';
import { SendButtonIcon } from './send-button-icon';

type ChatPlainInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** 입력이 있을 때 본문을 전송한다. */
  onSend: () => void;
  /** 공백이 아닌 추천 입력이 하나라도 있는지. 빈 입력에서 랜덤 전송을 허용하는 조건이다. */
  hasSuggestions: boolean;
  /** 입력이 비었을 때 전송 버튼이 대신 호출한다. 추천 입력 하나를 골라 바로 보낸다. */
  onSendRandomSuggestion: () => void;
  /** 커서 위치나 선택 영역에 `*...*` 상황 마커를 넣는다. */
  onInsertEmphasis: () => void;
  /** 응답 생성 중이면 입력과 상황 추가 버튼을 잠그고 전송을 막는다. 설정 버튼은 누를 수 있다. */
  isStreaming: boolean;
  /** 컴포저가 마커 삽입과 채우기 뒤 커서를 옮기는 데 쓰는 textarea ref. */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
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
 * 자유 텍스트 한 칸으로 적는 일반 입력 모드의 입력창. form submit으로 전송하고, 입력이 비었으면서 선택지가
 * 켜져 있으면 추천 입력 랜덤 전송으로 바뀐다.
 */
export function ChatPlainInput({
  value,
  onChange,
  onSend,
  hasSuggestions,
  onSendRandomSuggestion,
  onInsertEmphasis,
  isStreaming,
  textareaRef,
  choicesEnabled,
  onOpenSettings,
  realtimeImageEnabled,
  turnCost,
  modelCode,
  longResponse,
  onLockedTap,
}: ChatPlainInputProps) {
  const hasInput = value.trim().length > 0;
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

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (canSend) {
      handleSend();
    }
  };

  return (
    <section className="px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <form onSubmit={handleSubmit}>
        <InputGroup className="rounded-lg">
          <LockedInputOverlay locked={isStreaming} onTap={onLockedTap} />
          <InputGroupTextarea
            ref={textareaRef}
            value={value}
            rows={1}
            placeholder="이야기를 어떻게 이어갈까요?"
            disabled={isStreaming}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => submitOnShortcut(event, canSend, handleSend)}
            className="max-h-[20dvh] pb-0"
          />
          {/* 잠금 층보다 위에 두어 설정 버튼은 응답 중에도 누를 수 있게 한다. */}
          <InputGroupAddon
            align="block-end"
            className="relative z-20 gap-1 pt-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="상황 묘사 추가"
              data-tour="add-situation"
              disabled={isStreaming}
              onClick={onInsertEmphasis}>
              상황 추가
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
                type="submit"
                variant="default"
                size="icon-sm"
                aria-label={showsRandomSend ? '추천 입력 랜덤 전송' : '전송'}
                data-tour="send"
                disabled={!canSend}>
                <SendButtonIcon
                  isStreaming={isStreaming}
                  showsRandomSend={showsRandomSend}
                />
              </Button>
            </div>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </section>
  );
}
