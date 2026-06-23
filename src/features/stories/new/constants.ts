import type { StoryCreateStep, TagCategoryConfig } from './types';

export const ADD_KEYWORD_MAX_LENGTH = 15;

export const ADDITIONAL_INFO_MAX_COUNT = 10;

export const ADDITIONAL_INFO_MAX_LENGTH = 100;

export const HORIZONTAL_SWIPE_THRESHOLD = 96;

export const HORIZONTAL_SWIPE_INTENT_RATIO = 1.5;

export const TEXT_INPUT_SELECTOR =
  'input, textarea, select, [contenteditable="true"]';

export const STORYLINE_RATING_SYNC_DEBOUNCE_MS = 300;

export const SELECTED_STORYLINE_COLLAPSED_MAX_HEIGHT = 64;

export const TAG_CATEGORIES = [
  {
    value: 'GENRE',
    label: '장르',
    placeholder: '예: 타임루프, 영지물, 먼치킨',
    required: true,
    maxSelectionCount: 3,
  },
  {
    value: 'PROTAGONIST',
    label: '주인공 특징',
    placeholder: '예: 사랑에 서툰, 타인을 믿지 못하는',
    required: true,
    maxSelectionCount: 3,
  },
  {
    value: 'SUPPORTING_CHARACTER',
    label: '주변 인물 특징',
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

export const getStorylineTabLabel = (index: number): string => {
  const ordinal = KOREAN_ORDINAL_WORDS[index];

  return ordinal ? `${ordinal} 번째` : `${index + 1}번째`;
};

export const STORYLINE_SELECT_LOADING_LABEL = '스토리라인 생성 중';

export const STORYLINE_GENERATING_LOADING_PHRASES = [
  '선택한 키워드 살펴보는 중...',
  '스토리라인 구상하는 중...',
  '이야기 흐름 엮는 중...',
];

export const STORY_COMPLETION_LOADING_PHRASES = [
  '입력한 정보 정리하는 중...',
  '스토리 써내려가는 중...',
  '문장 다듬는 중...',
];
