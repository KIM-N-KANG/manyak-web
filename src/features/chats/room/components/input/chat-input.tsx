'use client';

import { useState } from 'react';

import { type useChatComposer } from '../../hooks/use-chat-composer';
import { type ChatInputMode } from '../../hooks/use-chat-input-mode';
import { ChatBlockInput } from './chat-block-input';
import { ChatPlainInput } from './chat-plain-input';
import { ChatSettingsSheet } from './chat-settings-sheet';

type ChatInputProps = {
  mode: ChatInputMode;
  onModeChange: (mode: ChatInputMode) => void;
  composer: ReturnType<typeof useChatComposer>;
  isStreaming: boolean;
  realtimeImageEnabled: boolean;
  onRealtimeImageEnabledChange: (enabled: boolean) => void;
  choicesEnabled: boolean;
  onChoicesEnabledChange: (enabled: boolean) => void;
  showCreditCost: boolean;
};

export function ChatInput({
  mode,
  onModeChange,
  composer,
  isStreaming,
  realtimeImageEnabled,
  onRealtimeImageEnabledChange,
  choicesEnabled,
  onChoicesEnabledChange,
  showCreditCost,
}: ChatInputProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);
  // 시트는 입력 모드가 바뀌어도 열린 채 남아야 하므로 블럭·일반 입력 바깥에 둔다.
  const settingsSheet = (
    <ChatSettingsSheet
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      realtimeImageEnabled={realtimeImageEnabled}
      onRealtimeImageEnabledChange={onRealtimeImageEnabledChange}
      choicesEnabled={choicesEnabled}
      onChoicesEnabledChange={onChoicesEnabledChange}
      mode={mode}
      onModeChange={onModeChange}
    />
  );

  if (mode === 'block') {
    return (
      <>
        <ChatBlockInput
          blocks={composer.blocks}
          onAddBlock={composer.addBlock}
          onRemoveBlock={composer.removeBlock}
          onUpdateBlock={composer.updateBlock}
          onRegisterInput={composer.registerBlockInput}
          onSend={composer.sendBlocks}
          hasSuggestions={composer.hasSuggestions}
          onSendRandomSuggestion={composer.sendRandomSuggestion}
          isStreaming={isStreaming}
          choicesEnabled={choicesEnabled}
          onOpenSettings={openSettings}
          showCreditCost={showCreditCost}
        />
        {settingsSheet}
      </>
    );
  }

  return (
    <>
      <ChatPlainInput
        value={composer.value}
        onChange={composer.setValue}
        onSend={composer.send}
        hasSuggestions={composer.hasSuggestions}
        onSendRandomSuggestion={composer.sendRandomSuggestion}
        onInsertEmphasis={composer.insertEmphasis}
        isStreaming={isStreaming}
        textareaRef={composer.textareaRef}
        choicesEnabled={choicesEnabled}
        onOpenSettings={openSettings}
        showCreditCost={showCreditCost}
      />
      {settingsSheet}
    </>
  );
}
