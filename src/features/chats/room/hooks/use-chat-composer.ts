import { useRef, useState } from 'react';

import { track } from '@/observability/analytics';

import {
  createDefaultInputBlocks,
  createInputBlock,
  type InputBlock,
  type InputBlockType,
  parseInputBlocks,
  serializeInputBlocks,
} from '../lib/input-blocks';
import { insertEmphasisMarkers } from '../lib/insert-emphasis-markers';
import { type ChatInputMode } from './use-chat-input-mode';

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
  const [value, setValue] = useState('');
  const [blocks, setBlocks] = useState<InputBlock[]>(createDefaultInputBlocks);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blockInputRefs = useRef(new Map<string, HTMLTextAreaElement>());

  const submit = (text: string) => {
    track('client_chat_messageInput_submitted', {
      chat_id: chatId,
      turn_number: turnCount + 1,
    });
    onSend(text);
  };

  const send = () => {
    const text = value.trim();

    if (!text || isStreaming) return;

    setValue('');
    submit(text);
  };

  const focusBlock = (id: string) => {
    requestAnimationFrame(() => {
      blockInputRefs.current.get(id)?.focus();
    });
  };

  const registerBlockInput = (
    id: string,
    element: HTMLTextAreaElement | null,
  ) => {
    if (element) {
      blockInputRefs.current.set(id, element);
    } else {
      blockInputRefs.current.delete(id);
    }
  };

  const addBlock = (type: InputBlockType) => {
    const block = createInputBlock(type);

    setBlocks((current) => [...current, block]);
    focusBlock(block.id);
  };

  const removeBlock = (id: string) => {
    setBlocks((current) => current.filter((block) => block.id !== id));
  };

  const updateBlock = (id: string, nextValue: string) => {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, value: nextValue } : block,
      ),
    );
  };

  const sendBlocks = () => {
    const text = serializeInputBlocks(blocks);

    if (!text || isStreaming) return;

    setBlocks(createDefaultInputBlocks());
    submit(text);
  };

  const sendChoice = (text: string, position: number) => {
    const trimmed = text.trim();

    if (!trimmed || isStreaming) return;

    track('client_chat_choiceOption_selected', {
      chat_id: chatId,
      turn_number: turnCount + 1,
      position,
    });
    setValue('');
    setBlocks(createDefaultInputBlocks());
    submit(trimmed);
  };

  const fillChoice = (text: string) => {
    if (inputMode === 'block') {
      const nextBlocks = parseInputBlocks(text);

      setBlocks(nextBlocks);

      if (nextBlocks[0]) {
        focusBlock(nextBlocks[0].id);
      }

      return;
    }

    setValue(text);
    requestAnimationFrame(() => {
      const element = textareaRef.current;

      if (!element) return;

      element.focus();
      element.setSelectionRange(text.length, text.length);
    });
  };

  /** 모드 전환 시 작성 중 내용을 다음 모드 형식으로 변환해 유실을 막는다. */
  const convertTo = (nextMode: ChatInputMode) => {
    if (nextMode === inputMode) return;

    if (nextMode === 'block') {
      const parsed = parseInputBlocks(value);

      setBlocks(parsed.length > 0 ? parsed : createDefaultInputBlocks());
      setValue('');
    } else {
      setValue(serializeInputBlocks(blocks));
      setBlocks([]);
    }
  };

  const insertEmphasis = () => {
    const element = textareaRef.current;

    if (!element) return;

    const {
      value: nextValue,
      cursorStart,
      cursorEnd,
    } = insertEmphasisMarkers(
      value,
      element.selectionStart,
      element.selectionEnd,
    );

    setValue(nextValue);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  return {
    value,
    setValue,
    textareaRef,
    blocks,
    addBlock,
    removeBlock,
    updateBlock,
    registerBlockInput,
    sendBlocks,
    send,
    sendChoice,
    fillChoice,
    insertEmphasis,
    convertTo,
  };
}
