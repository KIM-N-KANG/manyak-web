/** 일반 제작 화면 정본 문구다. 아직 만들지 않은 탭은 준비 중 안내만 둔다. */
export const GENERAL_STORY_CREATE_COPY = {
  title: '스토리 일반 제작',
  preparing: '준비 중이에요',
  close: '스토리 만들기 닫기',
  draftSave: '임시 저장',
  draftSaved: '임시 저장됨',
} as const;

/**
 * 닫기 확인 다이얼로그의 종류. Android 간편 제작의 이탈 경고와 같은 기준으로 고른다.
 * `unsaved`는 임시 저장 뒤 편집이 남은 경우, `saved`는 임시 저장본만 남은 경우,
 * `nothing`은 저장한 것도 저장할 것도 없는 경우다.
 */
export type GeneralStoryExitWarning = 'unsaved' | 'saved' | 'nothing';

export const GENERAL_STORY_EXIT_WARNING_COPY = {
  unsaved: {
    title: '임시 저장하지 않은 내용이 있어요',
    description: '지금 나가면 임시 저장한 뒤에 만든 내용은 사라져요',
    cancel: '닫기',
    confirm: '나가기',
  },
  saved: {
    title: '스토리 만들기를 그만둘까요?',
    description: '만들던 내용은 제작 탭의 이어서 만들기에서 계속할 수 있어요',
    cancel: '닫기',
    confirm: '나가기',
  },
  nothing: {
    title: '스토리를 그만 만들까요?',
    description: '지금 나가면 만들고 있는 내용이 사라져요',
    cancel: '닫기',
    confirm: '그만 만들기',
  },
} as const satisfies Record<
  GeneralStoryExitWarning,
  { title: string; description: string; cancel: string; confirm: string }
>;

/** 탭에서 입력하는 글 항목이다. 키는 등록 요청(`CreateGeneralStoryRequest`)의 필드명과 같다. */
export const GENERAL_STORY_TEXT_FIELDS = {
  title: {
    label: '제목',
    minLength: 2,
    minLengthError: '제목은 2자 이상 입력해 주세요',
    maxLength: 100,
    multiline: false,
    placeholder: '예: 노선도에 없는 역',
    description: '스토리의 특징이 드러나는 제목을 지어주세요',
  },
  oneLineIntro: {
    label: '한 줄 소개',
    maxLength: 255,
    multiline: true,
    placeholder: '예: 막차에서 내린 곳은 존재하지 않는 역이었다',
    description: '스토리의 핵심을 한 문장으로 적어주세요',
  },
  worldSetting: { label: '세계관', multiline: true },
  ruleSetting: { label: '규칙', multiline: true },
  userRoleSetting: { label: '주인공(나)', multiline: true },
  characterSetting: { label: '주변 인물', multiline: true },
} as const satisfies Record<
  string,
  {
    label: string;
    minLength?: number;
    minLengthError?: string;
    maxLength?: number;
    multiline: boolean;
    placeholder?: string;
    description?: string;
  }
>;

export type GeneralStoryTextField = keyof typeof GENERAL_STORY_TEXT_FIELDS;

/**
 * 입력 탭 순서와 각 탭의 글 항목이다. 필수 항목을 가진 탭을 앞에, 게시 정보를 정하는 등록을 끝에 둔다.
 * `required`는 탭 안에 필수 항목이 하나라도 있으면 참이며 탭 이름에 `*`를 붙인다.
 */
export const GENERAL_STORY_TABS = [
  {
    value: 'basic',
    label: '기본 정보',
    required: true,
    fields: ['title', 'oneLineIntro'],
  },
  {
    value: 'story',
    label: '스토리 설정',
    required: true,
    fields: ['worldSetting', 'ruleSetting'],
  },
  {
    value: 'character',
    label: '인물 설정',
    required: true,
    fields: ['userRoleSetting', 'characterSetting'],
  },
  { value: 'start', label: '시작 설정', required: true, fields: [] },
  { value: 'event', label: '주요 사건', required: false, fields: [] },
  { value: 'publish', label: '등록', required: true, fields: [] },
] as const satisfies readonly {
  value: string;
  label: string;
  required: boolean;
  fields: readonly GeneralStoryTextField[];
}[];

export type GeneralStoryTab = (typeof GENERAL_STORY_TABS)[number]['value'];

/** 기본 정보 탭의 커버 이미지(요청의 표지 `thumbnailObjectKey`) 입력 문구다. */
export const GENERAL_STORY_COVER_COPY = {
  label: '커버 이미지',
  description: '가로 3 : 세로 4 비율을 추천해요',
  fileRule: '(JPG, PNG, WEBP / 최대 5MB)',
  upload: '이미지 추가',
  remove: '삭제',
} as const;
