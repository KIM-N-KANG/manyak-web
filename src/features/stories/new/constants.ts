import type { RevealHint } from '@/hooks/use-revealed-hints';

import type {
  CharacterGender,
  StoryCreateStep,
  TagCategoryConfig,
} from './types';

export const ADD_TAG_MAX_LENGTH = 15;

/** 인물 이름 입력의 클라이언트 상한. 서버 스키마도 30자다. */
export const CHARACTER_NAME_MAX_LENGTH = 30;

/** 인물 한 명이 고를 수 있는 특징 개수 상한 */
export const CHARACTER_FEATURE_MAX_COUNT = 3;

/** 장르 키워드 선택 상한 */
export const GENRE_MAX_SELECTION_COUNT = 3;

export const GENRE_SECTION_LABEL = `장르 (최대 ${GENRE_MAX_SELECTION_COUNT}개)`;

/** 주변 인물 인원 상한 */
export const SUPPORTING_CHARACTER_MAX_COUNT = 5;

/** 퍼널 진입 시 미리 놓아 두는 주변 인물 수. 삭제하면 0명까지 줄일 수 있다. */
export const SUPPORTING_CHARACTER_INITIAL_COUNT = 1;

export const CHARACTER_BASIC_INFO_LABEL = '기본 정보';

export const CHARACTER_BASIC_INFO_DESCRIPTION = '비워두면 랜덤으로 설정해요';

export const CHARACTER_FEATURE_LABEL = `특징 (최대 ${CHARACTER_FEATURE_MAX_COUNT}개)`;

export const CHARACTER_GENDER_OPTIONS = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
] as const satisfies readonly { value: CharacterGender; label: string }[];

/** 성별을 고르지 않은 상태(AI가 정함)를 나타내는 Select 값 */
export const CHARACTER_GENDER_RANDOM_VALUE = 'RANDOM';

export const CHARACTER_GENDER_SELECT_OPTIONS = [
  { value: CHARACTER_GENDER_RANDOM_VALUE, label: '랜덤 성별' },
  ...CHARACTER_GENDER_OPTIONS,
] as const;

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

// description은 화면에 그대로 노출하는 완성 문장이다. 선택 개수 상한은 섹션
// 라벨이 알리므로(장르·특징) 여기서는 인원 상한만 덧붙인다.
export const GENRE_CATEGORY = {
  value: 'GENRE',
  label: '장르',
  description: '스토리의 분위기와 소재를 정해요',
  placeholder: '예: 타임루프, 영지물, 먼치킨',
  required: true,
  maxSelectionCount: GENRE_MAX_SELECTION_COUNT,
} satisfies TagCategoryConfig;

export const PROTAGONIST_CATEGORY = {
  value: 'PROTAGONIST',
  label: '주인공 특징',
  description: '스토리 속 나를 설정해요',
  placeholder: '예: 사랑에 서툰, 타인을 믿지 못하는',
  namePlaceholder: '예: 마냑',
  required: true,
  maxSelectionCount: CHARACTER_FEATURE_MAX_COUNT,
} satisfies TagCategoryConfig;

export const SUPPORTING_CHARACTER_CATEGORY = {
  value: 'SUPPORTING_CHARACTER',
  label: '주변 인물 특징',
  description: `주변 인물들을 설정해요 (최대 ${SUPPORTING_CHARACTER_MAX_COUNT}명)`,
  placeholder: '예: 상냥해서 더 위험한, 어딘가 망가진',
  namePlaceholder: '예: 도라지',
  required: false,
  maxSelectionCount: CHARACTER_FEATURE_MAX_COUNT,
} satisfies TagCategoryConfig;

export const TAG_CATEGORIES = [
  GENRE_CATEGORY,
  PROTAGONIST_CATEGORY,
  SUPPORTING_CHARACTER_CATEGORY,
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
