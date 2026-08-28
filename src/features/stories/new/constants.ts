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

/** 주변 인물 이름 플레이스홀더. 인원 상한만큼 두어 카드마다 다른 예시를 보여 준다. */
export const SUPPORTING_CHARACTER_NAME_PLACEHOLDERS = [
  '예: 한도윤',
  '예: 이서연',
  '예: 박시우',
  '예: 정하린',
  '예: 최은우',
] as const;

export const CHARACTER_BASIC_INFO_LABEL = '기본 정보';

export const CHARACTER_BASIC_INFO_DESCRIPTION = '비워두면 랜덤으로 설정해요';

export const CHARACTER_FEATURE_LABEL = `특징 (최대 ${CHARACTER_FEATURE_MAX_COUNT}개)`;

/** 특징이 선택 항목인 인물(주변 인물)에만 붙이는 설명 */
export const CHARACTER_FEATURE_RANDOM_DESCRIPTION =
  '선택하지 않으면 랜덤으로 설정해요';

export const CHARACTER_NAME_DUPLICATE_ERROR = '이미 사용한 이름이에요';

export const CHARACTER_NAME_DUPLICATE_FOOTER_ERROR =
  '인물 이름이 겹치지 않게 해주세요';

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

// 인물의 이름·성별·특징은 앞선 키워드 단계에서 받으므로 예시에서 뺀다. 남은 축인
// 배경·분위기·전개·결말·문체·제약을 고루 보여 준다.
export const ADDITIONAL_INFO_PLACEHOLDERS = [
  '예: 배경은 현대의 서울로 해줘',
  '예: 시대 배경은 1990년대로 잡아줘',
  '예: 주요 무대는 오래된 서점으로 해줘',
  '예: 계절 배경은 겨울로 해줘',
  '예: 전체적으로 밝고 유쾌한 분위기로 그려줘',
  '예: 초반에 큰 오해로 갈등이 시작되게 해줘',
  '예: 잔잔하게 시작해서 후반에 몰아쳐줘',
  '예: 비 오는 날 우연히 마주치는 장면을 넣어줘',
  '예: 마지막은 반전이 있는 결말로 마무리해줘',
  '예: 잔인하거나 무서운 묘사는 빼줘',
] as const;

export const STORYLINE_RATING_SYNC_DEBOUNCE_MS = 300;

export const GENRE_CATEGORY = {
  value: 'GENRE',
  label: '장르',
  placeholder: '예: 타임루프, 영지물, 먼치킨',
  required: true,
  maxSelectionCount: GENRE_MAX_SELECTION_COUNT,
} satisfies TagCategoryConfig;

export const PROTAGONIST_CATEGORY = {
  value: 'PROTAGONIST',
  label: '주인공 (나)',
  placeholder: '예: 사랑에 서툰, 타인을 믿지 못하는',
  namePlaceholder: '예: 서지우',
  required: true,
  maxSelectionCount: CHARACTER_FEATURE_MAX_COUNT,
} satisfies TagCategoryConfig;

export const SUPPORTING_CHARACTER_CATEGORY = {
  value: 'SUPPORTING_CHARACTER',
  label: '주변 인물',
  placeholder: '예: 위험한, 어딘가 망가진',
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

export const SELECTED_TAGS_TRIGGER_LABEL = '선택한 키워드 보기';

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
