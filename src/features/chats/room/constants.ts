import type { ChatInputMode } from './utils/chat-input-config';
import type { InputBlockType } from './utils/input-blocks';

export const CHAT_INPUT_MODE_STORAGE_KEY = 'manyak:chat-input-mode';

export const CHAT_CHOICES_ENABLED_STORAGE_KEY = 'manyak:chat-choices-enabled';

export const DEFAULT_CHAT_INPUT_MODE: ChatInputMode = 'block';

/**
 * 첫 스트림 이벤트 전 로딩 문구. 실시간 이미지가 켜져 있으면 장면 썸네일 자리와 함께
 * 제작 퍼널 로딩처럼 문구를 순환하고, 꺼져 있으면 한 문구만 쉬머로 보인다.
 */
export const CHAT_STREAM_LOADING_COPY = {
  writing: '다음 내용 준비 중',
  writingLabel: '답변을 작성하고 있어요',
  scenePhrases: [
    '어울리는 표정 찾는 중',
    '다음 내용 준비 중',
    '장면 완성 중',
    '다음 대사 고민 중',
  ],
  sceneLabel: '다음 장면을 만들고 있어요',
} as const;

export const CHAT_REALTIME_IMAGE_ENABLED_STORAGE_KEY =
  'manyak:chat-realtime-image-enabled';

/** 채팅 설정 시트의 문구. 그룹 순서와 항목 순서는 화면 순서 그대로다. */
export const CHAT_SETTINGS_COPY = {
  trigger: '채팅 설정',
  title: '채팅 설정',
  groups: {
    features: '채팅 기능',
    inputMode: '입력 모드',
  },
  realtimeImage: {
    label: '실시간 이미지',
    description: '대화에 따라 인물 한 명의 표정과 모습이 달라져요',
  },
  choices: {
    label: 'AI 추천 입력',
    description: 'AI가 다음 전개를 추천해줘요',
  },
  blockInput: {
    label: '블럭 입력',
    description: '상황과 대사를 나눠서 입력해요',
  },
} as const;

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

export const CHAT_CHOICES_HINT_SEEN_STORAGE_KEY =
  'manyak:chat-choices-hint-seen';

export const CHAT_CHOICES_HINT_SEEN_VALUE = 'true';

/**
 * 전송 버튼 옆에 붙는 채팅 턴 비용 문구를 만든다. 금액은 서버 정책값이라 문자열로 받는다.
 *
 * @param amount 채팅 한 턴에 드는 이프의 표시 문자열
 * @returns 비용 표시 문구
 */
export const buildChatTurnCreditCostLabel = (amount: string) =>
  `${amount} 이프`;
