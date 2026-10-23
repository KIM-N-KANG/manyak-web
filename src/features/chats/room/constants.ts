import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';

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

/** 실시간 이미지 기본값. 꺼 두고 안내로 켜는 방법을 알린다. */
export const DEFAULT_REALTIME_IMAGE_ENABLED = false;

export const CHAT_COMPLETED_TURN_COUNT_STORAGE_KEY =
  'manyak:chat-completed-turn-count';

/** 실시간 이미지가 꺼져 있으면 설정 시트로 안내하는 기기 누적 턴 전송 완료 횟수. */
export const REALTIME_IMAGE_NUDGE_TURN_COUNT = 2;

/** 응답이 끝난 뒤 안내 시트를 열기까지 두는 간격(ms). 방금 도착한 응답을 읽을 틈이다. */
export const REALTIME_IMAGE_NUDGE_DELAY_MS = 500;

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
    noticeLabel: '실시간 이미지 안내',
    notice: '이미지를 만들지 못한 경우 사용된 이프가 자동으로 취소돼요',
    nudge: {
      title: '실시간 이미지를 켜보세요',
      description: '대화에 따라 달라지는 인물의 모습을 볼 수 있어요',
      confirm: '확인',
    },
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

/**
 * 게스트와 턴 체험이 남은 회원의 턴에 서버가 쓰는 모델 코드. 고른 모델과 무관하게 이 모델로 무료 응답한다.
 * 게스트는 다른 모델을 고를 수 없어 이 모델을 고른 것으로 보인다.
 */
export const CHAT_TRIAL_MODEL_CODE = 'LITE';

/** 채팅방 헤더 AI 모델 선택 버튼과 채팅 응답 시트의 문구. 모델 이름과 순서는 서버 모델 목록을 따른다. */
export const CHAT_MODEL_COPY = {
  trigger: 'AI 모델 선택',
  title: '채팅 응답',
  group: 'AI 모델',
  /** 모델 코드별 칸 설명. 모르는 코드는 설명 없이 이름과 비용만 보인다 */
  optionDescriptions: {
    LITE: '빠르고 가볍게 주고받아요',
    AURORA: '풍부한 묘사로 몰입감을 더해요',
  } as Record<string, string | undefined>,
  responseLength: {
    group: '응답 길이',
    label: '긴 응답',
    description: '한 번에 더 많은 장면을 보여줘요',
  },
} as const;

/** 채팅방 헤더 메뉴 시트의 문구. 항목 순서는 화면 순서 그대로다. */
export const CHAT_MENU_COPY = {
  trigger: '채팅 메뉴',
  title: '채팅 메뉴',
  newChat: '새 채팅 시작하기',
  share: '공유하기',
  report: STORY_REPORT_COPY.action,
  delete: '삭제하기',
  deleteConfirm: {
    title: '채팅을 삭제할까요?',
    description: '삭제하면 목록에서 사라지며 되돌릴 수 없어요',
    cancel: '남겨두기',
    confirm: '삭제하기',
    pending: '삭제 중',
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
 * 채팅 턴 비용 문구를 만든다. 금액은 서버 정책값이라 문자열로 받는다.
 *
 * @param amount 채팅 한 턴에 드는 이프의 표시 문자열
 * @returns 비용 표시 문구
 */
export const buildChatTurnCreditCostLabel = (amount: string) =>
  `${amount} 이프`;

/** 전송 버튼 옆 비용 버튼과 이프 안내 팝오버의 문구. */
export const CHAT_TURN_COST_INFO_COPY = {
  trigger: '이프 안내',
  title: '한 턴에 쓰는 이프',
  turn: 'AI 응답',
  realtimeImage: '실시간 이미지',
  /** 긴 응답이 켜졌을 때 AI 응답 항목의 모델 이름 옆 표시 */
  buildLongResponseDetail: (modelName: string) => `${modelName}, 긴 응답`,
  total: '합계',
  buildTrialRemaining: (count: number) => `무료 체험 ${count}회 남음`,
  trialUnlimited: '무료 체험 무제한',
  /** 턴 체험이 남은 회원이 다른 모델을 골랐을 때. 서버는 체험 턴을 체험 모델로 답한다 */
  buildTrialModelNote: (modelName: string) =>
    `무료 체험 턴은 ${modelName} 모델로 답해요`,
} as const;
