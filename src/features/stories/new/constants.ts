import type { StoryCreateStep, TagCategoryConfig } from './types';

export const ADD_KEYWORD_MAX_LENGTH = 15;

export const ADDITIONAL_INFO_MAX_COUNT = 3;

export const ADDITIONAL_INFO_MAX_LENGTH = 100;

export const STORY_CREATE_STEP_PROGRESS_LABELS = {
  keyword: '1 / 3',
  'storyline-select': '2 / 3',
  'additional-info': '3 / 3',
} satisfies Record<Exclude<StoryCreateStep, 'complete'>, string>;

export const TAG_CATEGORIES = [
  {
    value: 'GENRE',
    label: '장르',
    placeholder: '예: 타임루프, 영지물, 먼치킨',
    required: true,
    maxSelectionCount: 5,
  },
  {
    value: 'PROTAGONIST',
    label: '주인공',
    placeholder: '예: 사랑에 서툰, 타인을 믿지 못하는',
    required: true,
    maxSelectionCount: 5,
  },
  {
    value: 'SUPPORTING_CHARACTER',
    label: '주변 인물',
    placeholder: '예: 상냥해서 더 위험한, 어딘가 망가진',
    required: false,
    maxSelectionCount: 10,
  },
] satisfies TagCategoryConfig[];

export const SKELETON_TAG_CHIP_WIDTH_CLASSES = [
  'w-14',
  'w-16',
  'w-20',
  'w-24',
  'w-28',
  'w-32',
  'w-36',
  'w-40',
] as const;
