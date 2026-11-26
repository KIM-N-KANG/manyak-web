import { useState } from 'react';

import { useInputRefRegistry } from '@/hooks/use-input-ref-registry';

import {
  createDefaultInputBlocks,
  createInputBlock,
  type InputBlock,
  type InputBlockType,
  serializeInputBlocks,
} from '../utils/input-blocks';

type UseChatBlockComposerParams = {
  submitText: (text: string) => Promise<boolean>;
  /** 마운트 시 되살릴 블럭 목록(로그인 복귀 초안). */
  initialBlocks?: InputBlock[];
};

/**
 * 블럭(묘사/대사) 입력 모드의 블럭 목록 상태와 편집·전송 동작을 관리하는 훅
 *
 * @param submitText 완성된 텍스트를 전송하고 성공 여부를 반환하는 함수
 * @param initialBlocks 마운트 시 되살릴 블럭 목록
 * @returns 블럭 목록과 추가·삭제·수정·전송·교체·초기화 동작
 */
export function useChatBlockComposer({
  submitText,
  initialBlocks,
}: UseChatBlockComposerParams) {
  const [blocks, setBlocks] = useState<InputBlock[]>(
    () => initialBlocks ?? createDefaultInputBlocks(),
  );
  const { registerInput: registerBlockInput, focusInput: focusBlock } =
    useInputRefRegistry<HTMLTextAreaElement>();

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

  /** 블럭을 직렬화해 전송하고, 성공해도 그사이 블럭이 바뀌었으면 새 입력을 지우지 않는다. */
  const send = async () => {
    const text = serializeInputBlocks(blocks, '\n\n');

    if (await submitText(text)) {
      setBlocks((current) =>
        current === blocks ? createDefaultInputBlocks() : current,
      );
    }
  };

  const replace = (nextBlocks: InputBlock[]) => {
    setBlocks(nextBlocks);

    if (nextBlocks[0]) {
      focusBlock(nextBlocks[0].id);
    }
  };

  /** 기본 블럭(상황 1개, 대사 1개)으로 되돌린다. 선택지를 보낸 뒤 쓴다. */
  const reset = () => setBlocks(createDefaultInputBlocks());

  /** 블럭을 모두 비운다. 일반 모드로 바꿀 때 쓰며, 다시 블럭 모드로 오면 `replace` 가 채운다. */
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
