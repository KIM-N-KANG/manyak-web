import type { InputBlockType } from './input-blocks';

export type ChatInputMode = 'block' | 'plain';

export const CHAT_INPUT_MODE_STORAGE_KEY = 'manyak:chat-input-mode';

export const DEFAULT_CHAT_INPUT_MODE: ChatInputMode = 'block';

export const CHAT_INPUT_MODE_OPTIONS: {
  value: ChatInputMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'block',
    label: '블럭 입력',
    description: '상황과 대사를 나눠서 입력해요',
  },
  {
    value: 'plain',
    label: '일반 입력',
    description: '한 입력창에 자유롭게 입력해요',
  },
];

export const INPUT_BLOCK_PLACEHOLDERS: Record<InputBlockType, string> = {
  situation: '어떤 상황을 묘사할까요?',
  dialogue: '어떤 대사를 건넬까요?',
};

export const INPUT_BLOCK_LABELS: Record<InputBlockType, string> = {
  situation: '상황',
  dialogue: '대사',
};

export function isChatInputMode(value: string | null): value is ChatInputMode {
  return value === 'block' || value === 'plain';
}
