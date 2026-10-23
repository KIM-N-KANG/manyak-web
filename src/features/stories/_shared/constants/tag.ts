/** 직접 추가하는 키워드의 최대 글자 수다. 간편 제작 인물 특징의 키워드 추가 다이얼로그가 쓴다. */
export const ADD_TAG_MAX_LENGTH = 15;

/** 키워드를 불러오는 동안 보여 주는 스켈레톤 칩 너비다. */
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

/** 칩 목록(장르, 인물 특징 키워드)을 받지 못했을 때 칩 자리에 두는 다시 시도 버튼 문구다. */
export const TAG_LOAD_RETRY_LABEL = '키워드를 불러오지 못했어요. 다시 시도';
