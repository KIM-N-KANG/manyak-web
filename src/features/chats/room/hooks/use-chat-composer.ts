import type { ContinueChatRequestUserSource } from '@/api/generated/models';
import { track } from '@/observability/analytics';

import type { ChatChoiceSelection } from '../types';
import {
  createDefaultInputBlocks,
  type InputBlockType,
  parseInputBlocks,
  serializeInputBlocks,
} from '../utils/input-blocks';
import { getRandomSuggestion } from '../utils/random-suggestion';
import { useChatBlockComposer } from './use-chat-block-composer';
import { type ChatInputMode } from './use-chat-input-mode';
import { useChatPlainComposer } from './use-chat-plain-composer';
import { useChatSubmitActions } from './use-chat-submit-actions';

type UseChatComposerParams = {
  chatId: string;
  turnCount: number;
  isStreaming: boolean;
  inputMode: ChatInputMode;
  suggestions: string[];
  suggestionSourceTurnId?: number;
  onSend: (
    text: string,
    userSource: ContinueChatRequestUserSource,
    selection?: ChatChoiceSelection,
  ) => void;
};

/**
 * 일반/블럭 컴포저를 통합해 채팅 입력의 상태와 동작을 제공하는 훅.
 * 현재 입력 모드에 맞춰 전송·채우기·모드 전환을 처리하고 분석 이벤트를 기록한다.
 *
 * @param chatId 대상 채팅 ID
 * @param turnCount 현재까지의 턴 개수
 * @param isStreaming 응답 스트리밍 진행 여부
 * @param inputMode 현재 입력 모드(일반/블럭)
 * @param suggestions 추천 입력 문구 목록
 * @param suggestionSourceTurnId 추천 문구가 달린 원본 턴 ID
 * @param onSend 완성된 텍스트와 그 출처를 전송하는 콜백
 * @returns 입력 값·블럭 상태와 전송·채우기·모드 전환 등의 동작
 */
export function useChatComposer({
  chatId,
  turnCount,
  isStreaming,
  inputMode,
  suggestions,
  suggestionSourceTurnId,
  onSend,
}: UseChatComposerParams) {
  const { submitText, submitChoice, trackChoiceFill, rememberFilledChoice } =
    useChatSubmitActions({
      chatId,
      turnCount,
      isStreaming,
      inputMode,
      onSend,
    });
  const plainComposer = useChatPlainComposer({ submitText });
  const blockComposer = useChatBlockComposer({ submitText });

  /** 작성 중인 입력이 있는지 여부. 추천 문구 덮어쓰기 확인에 사용한다. */
  const hasDraft =
    inputMode === 'block'
      ? blockComposer.blocks.some((block) => block.value.trim().length > 0)
      : plainComposer.value.trim().length > 0;

  const addBlock = (type: InputBlockType) => {
    track('client_chat_addBlockButton_clicked', {
      chat_id: chatId,
      block_type: type,
    });
    blockComposer.addBlock(type);
  };

  const removeBlock = (id: string) => {
    const target = blockComposer.blocks.find((block) => block.id === id);

    if (target) {
      track('client_chat_removeBlockButton_clicked', {
        chat_id: chatId,
        block_type: target.type,
      });
    }

    blockComposer.removeBlock(id);
  };

  const insertEmphasis = () => {
    track('client_chat_situationInsertButton_clicked', { chat_id: chatId });
    plainComposer.insertEmphasis();
  };

  const sendChoice = (
    text: string,
    position: number,
    sourceTurnId?: number,
  ) => {
    if (submitChoice(text, position, sourceTurnId)) {
      plainComposer.clear();
      blockComposer.reset();
    }
  };

  const sendRandomSuggestion = () => {
    const suggestion = getRandomSuggestion(suggestions);

    if (suggestion) {
      sendChoice(suggestion.text, suggestion.position, suggestionSourceTurnId);
    }
  };

  const fillChoice = (
    text: string,
    position: number,
    sourceTurnId?: number,
  ) => {
    trackChoiceFill(position);
    rememberFilledChoice(text, position, sourceTurnId);

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
    hasDraft,
    hasSuggestions: suggestions.some((suggestion) => suggestion.trim()),
    addBlock,
    removeBlock,
    updateBlock: blockComposer.updateBlock,
    registerBlockInput: blockComposer.registerBlockInput,
    sendBlocks: blockComposer.send,
    send: plainComposer.send,
    sendChoice,
    sendRandomSuggestion,
    fillChoice,
    insertEmphasis,
    convertTo,
  };
}
