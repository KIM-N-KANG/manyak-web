import type { ChatInputMode } from './utils/chat-input-config';
import type { InputBlockType } from './utils/input-blocks';

export const CHAT_INPUT_MODE_STORAGE_KEY = 'manyak:chat-input-mode';

export const CHAT_CHOICES_ENABLED_STORAGE_KEY = 'manyak:chat-choices-enabled';

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

export const CHAT_CHOICES_TOGGLE_OPTIONS: {
  value: 'on' | 'off';
  label: string;
  description: string;
}[] = [
  {
    value: 'on',
    label: '추천 입력 켬',
    description: 'AI가 다음 전개를 추천해줘요',
  },
  {
    value: 'off',
    label: '추천 입력 끔',
    description: '추천 없이 직접 입력해요',
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

export const CHAT_TOUR_SEEN_STORAGE_KEY = 'manyak:chat-tour-seen';

export const CHAT_TOUR_SEEN_VALUE = 'true';
