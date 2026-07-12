'use client';

import { type useChatComposer } from '../../hooks/use-chat-composer';
import { type ChatInputMode } from '../../hooks/use-chat-input-mode';
import { ChatBlockInput } from './chat-block-input';
import { ChatPlainInput } from './chat-plain-input';

type ChatInputProps = {
  mode: ChatInputMode;
  composer: ReturnType<typeof useChatComposer>;
  disabled: boolean;
};

export function ChatInput({ mode, composer, disabled }: ChatInputProps) {
  if (mode === 'block') {
    return (
      <ChatBlockInput
        blocks={composer.blocks}
        onAddBlock={composer.addBlock}
        onRemoveBlock={composer.removeBlock}
        onUpdateBlock={composer.updateBlock}
        onRegisterInput={composer.registerBlockInput}
        onSend={composer.sendBlocks}
        hasSuggestions={composer.hasSuggestions}
        onSendRandomSuggestion={composer.sendRandomSuggestion}
        disabled={disabled}
      />
    );
  }

  return (
    <ChatPlainInput
      value={composer.value}
      onChange={composer.setValue}
      onSend={composer.send}
      hasSuggestions={composer.hasSuggestions}
      onSendRandomSuggestion={composer.sendRandomSuggestion}
      onInsertEmphasis={composer.insertEmphasis}
      disabled={disabled}
      textareaRef={composer.textareaRef}
    />
  );
}
