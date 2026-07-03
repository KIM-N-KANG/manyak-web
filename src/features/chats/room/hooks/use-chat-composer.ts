import {
  createDefaultInputBlocks,
  parseInputBlocks,
  serializeInputBlocks,
} from '../lib/input-blocks';
import { useChatBlockComposer } from './use-chat-block-composer';
import { type ChatInputMode } from './use-chat-input-mode';
import { useChatPlainComposer } from './use-chat-plain-composer';
import { useChatSubmitActions } from './use-chat-submit-actions';

type UseChatComposerParams = {
  chatId: string;
  turnCount: number;
  isStreaming: boolean;
  inputMode: ChatInputMode;
  onSend: (text: string) => void;
};

export function useChatComposer({
  chatId,
  turnCount,
  isStreaming,
  inputMode,
  onSend,
}: UseChatComposerParams) {
  const { submitText, submitChoice } = useChatSubmitActions({
    chatId,
    turnCount,
    isStreaming,
    onSend,
  });
  const plainComposer = useChatPlainComposer({ submitText });
  const blockComposer = useChatBlockComposer({ submitText });

  const sendChoice = (text: string, position: number) => {
    if (submitChoice(text, position)) {
      plainComposer.clear();
      blockComposer.reset();
    }
  };

  const fillChoice = (text: string) => {
    if (inputMode === 'block') {
      blockComposer.replace(parseInputBlocks(text));

      return;
    }

    plainComposer.fill(text);
  };

  /** 모드 전환 시 작성 중 내용을 다음 모드 형식으로 변환해 유실을 막는다. */
  const convertTo = (nextMode: ChatInputMode) => {
    if (nextMode === inputMode) return;

    if (nextMode === 'block') {
      const parsed = parseInputBlocks(plainComposer.value);

      blockComposer.replace(
        parsed.length > 0 ? parsed : createDefaultInputBlocks(),
      );
      plainComposer.clear();
    } else {
      plainComposer.setValue(serializeInputBlocks(blockComposer.blocks));
      blockComposer.clear();
    }
  };

  return {
    value: plainComposer.value,
    setValue: plainComposer.setValue,
    textareaRef: plainComposer.textareaRef,
    blocks: blockComposer.blocks,
    addBlock: blockComposer.addBlock,
    removeBlock: blockComposer.removeBlock,
    updateBlock: blockComposer.updateBlock,
    registerBlockInput: blockComposer.registerBlockInput,
    sendBlocks: blockComposer.send,
    send: plainComposer.send,
    sendChoice,
    fillChoice,
    insertEmphasis: plainComposer.insertEmphasis,
    convertTo,
  };
}
