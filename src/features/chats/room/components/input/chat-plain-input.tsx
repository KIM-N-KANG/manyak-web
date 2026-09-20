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
import { ChatTurnCreditCost } from './chat-turn-credit-cost';
import { LockedInputOverlay } from './locked-input-overlay';
import { SendButtonIcon } from './send-button-icon';

type ChatPlainInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  hasSuggestions: boolean;
  onSendRandomSuggestion: () => void;
  onInsertEmphasis: () => void;
  isStreaming: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  choicesEnabled: boolean;
  onOpenSettings: () => void;
  /** 실시간 이미지가 켜져 있으면 비용 배지에 이미지 비용을 합산한다 */
  realtimeImageEnabled: boolean;
  /** 응답 생성 중 잠긴 입력창을 눌렀을 때 호출된다 */
  onLockedTap: () => void;
};

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
            <div className="ml-auto flex items-center gap-2">
              <ChatTurnCreditCost withRealtimeImage={realtimeImageEnabled} />
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
