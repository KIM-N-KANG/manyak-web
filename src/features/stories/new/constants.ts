import type { RevealHint } from '@/hooks/use-revealed-hints';

import type { StoryCreateStep, TagCategoryConfig } from './types';

export const ADD_TAG_MAX_LENGTH = 15;

export const ADDITIONAL_INFO_INITIAL_COUNT = 3;

export const ADDITIONAL_INFO_MAX_COUNT = 10;

export const ADDITIONAL_INFO_MAX_LENGTH = 100;

export const ADDITIONAL_INFO_PLACEHOLDERS = [
  '예: 내 이름을 마냑이라고 불러줘',
  '예: 메인 상대역은 남성/여성으로 해줘',
  '예: 나 20대 대학생이야',
  '예: 나를 막내아들로 설정해줘',
  '예: 배경은 현대의 서울로 해줘',
  '예: 나와 메인 상대역은 어릴 적 사귄 사이야',
  '예: 전체적으로 밝고 유쾌한 분위기로 그려줘',
  '예: 계절 배경은 겨울로 잡아줘',
  '예: 주요 무대는 오래된 서점으로 해줘',
  '예: 초반에 큰 오해로 갈등이 시작되게 해줘',
] as const;

export const STORYLINE_RATING_SYNC_DEBOUNCE_MS = 300;

export const SELECTED_STORYLINE_COLLAPSED_MAX_HEIGHT = 64;

export const TAG_CATEGORIES = [
  {
    value: 'GENRE',
    label: '장르',
    description: '스토리의 분위기와 소재를 정해요',
    placeholder: '예: 타임루프, 영지물, 먼치킨',
    required: true,
    maxSelectionCount: 3,
  },
  {
    value: 'PROTAGONIST',
    label: '주인공 특징',
    description: '이야기 속 나의 성격과 특징을 정해요',
    placeholder: '예: 사랑에 서툰, 타인을 믿지 못하는',
    required: true,
    maxSelectionCount: 3,
  },
  {
    value: 'SUPPORTING_CHARACTER',
    label: '주변 인물 특징',
    description: '주변 인물의 성격과 특징을 정해요',
    placeholder: '예: 상냥해서 더 위험한, 어딘가 망가진',
    required: false,
    maxSelectionCount: 5,
  },
] satisfies TagCategoryConfig[];

export const SKELETON_TAG_CHIP_WIDTH_CLASSES = [
  'w-24',
  'w-10',
  'w-32',
  'w-16',
  'w-14',
  'w-28',
  'w-20',
  'w-12',
  'w-24',
  'w-16',
  'w-10',
  'w-32',
  'w-14',
  'w-28',
  'w-20',
  'w-12',
  'w-24',
  'w-10',
  'w-16',
  'w-28',
] as const;

export const STORY_CREATE_INDICATOR_STEPS = [
  { step: 'keyword', label: '키워드 선택' },
  { step: 'storyline-select', label: '스토리라인 선택' },
  { step: 'additional-info', label: '추가 정보 입력' },
] as const satisfies readonly { step: StoryCreateStep; label: string }[];

export const STORY_CREATE_STEP_ORDER = [
  'keyword',
  'storyline-select',
  'additional-info',
  'complete',
] as const;

export const EXPECTED_STORYLINE_COUNT = 3;

const KOREAN_ORDINAL_WORDS = [
  '첫',
  '두',
  '세',
  '네',
  '다섯',
  '여섯',
  '일곱',
  '여덟',
  '아홉',
  '열',
] as const;

/**
 * 스토리라인 탭의 순번 라벨을 반환한다. 한글 서수 단어가 있으면 그것을, 없으면 숫자를 쓴다.
 *
 * @param index 0부터 시작하는 스토리라인 탭 인덱스
 * @returns 표시용 순번 라벨(예: `첫 번째`, `11번째`)
 */
export const getStorylineTabLabel = (index: number): string => {
  const ordinal = KOREAN_ORDINAL_WORDS[index];

  return ordinal ? `${ordinal} 번째` : `${index + 1}번째`;
};

export const STORYLINE_SELECT_LOADING_LABEL = '스토리라인 생성 중';

export const STORYLINE_GENERATING_LOADING_PHRASES = [
  '선택한 키워드 살펴보는 중...',
  '이야기의 뼈대 잡는 중...',
  '장면 순서 엮는 중...',
];

export const STORY_COMPLETION_LOADING_PHRASES = [
  '입력한 정보 정리하는 중...',
  '이야기를 문장으로 풀어내는 중...',
  '표현을 자연스럽게 다듬는 중...',
];

export const STORYLINE_GENERATING_LOADING_HINTS = [
  { delayMs: 15000, text: '스토리라인을 잡는 데 시간이 조금 더 걸리고 있어요' },
  {
    delayMs: 30000,
    text: '장면 흐름을 다시 맞춰보고 있어요',
  },
] as const satisfies readonly RevealHint[];

export const STORY_COMPLETION_LOADING_HINTS = [
  { delayMs: 15000, text: '스토리를 완성하는 데 시간이 조금 더 걸리고 있어요' },
  {
    delayMs: 30000,
    text: '세계관과 마무리를 다시 살펴보고 있어요',
  },
  {
    delayMs: 60000,
    text: '거의 다 완성됐어요',
  },
] as const satisfies readonly RevealHint[];
