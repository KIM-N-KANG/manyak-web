import { useRef, useState } from 'react';

import {
  createDefaultInputBlocks,
  createInputBlock,
  type InputBlock,
  type InputBlockType,
  serializeInputBlocks,
} from '../lib/input-blocks';

type UseChatBlockComposerParams = {
  submitText: (text: string) => boolean;
};

export function useChatBlockComposer({
  submitText,
}: UseChatBlockComposerParams) {
  const [blocks, setBlocks] = useState<InputBlock[]>(createDefaultInputBlocks);
  const blockInputRefs = useRef(new Map<string, HTMLTextAreaElement>());

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

  const send = () => {
    const text = serializeInputBlocks(blocks);

    if (submitText(text)) {
      setBlocks(createDefaultInputBlocks());
    }
  };

  const replace = (nextBlocks: InputBlock[]) => {
    setBlocks(nextBlocks);

    if (nextBlocks[0]) {
      focusBlock(nextBlocks[0].id);
    }
  };

  const reset = () => setBlocks(createDefaultInputBlocks());

  const clear = () => setBlocks([]);

  return {
    blocks,
    addBlock,
    removeBlock,
    updateBlock,
    registerBlockInput,
    send,
    replace,
    reset,
    clear,
  };
}
