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

/**
 * 탭에서 입력하는 글 항목이다. 키는 등록 요청(`CreateGeneralStoryRequest`)의 필드명이거나,
 * 스토리 설정 글(`worldSetting`·`ruleSetting`)을 이루는 절이다(`utils/story-setting-sections`).
 */
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
  world: {
    label: '세계관',
    maxLength: 5000,
    multiline: true,
    placeholder: [
      '예: 유실역은 막차가 끊긴 뒤에만 불이 켜지는, 노선도에 없는 역이다.',
      '세상에서 잃어버린 물건과 기억은 모두 이 역의 유실물 보관소로 모인다.',
      '무언가를 되찾으려면 대신 자신의 무언가 하나를 맡겨야 한다.',
      '',
      '# 전제',
      '막차에서 잘못 내린 주인공은 텅 빈 승강장에 홀로 남았다.',
      '',
      '# 갈등',
      '첫차가 오기 전에 역을 나가야 하지만, 보관소에는 주인공이 잊고 지낸 누군가의 기억이 있다.',
    ].join('\n'),
    description:
      '시대와 장소, 사회의 모습처럼 스토리의 배경이 되는 설정이에요. 마법이 작동하는 원리나 기술의 수준 등 이 세계만의 특징과 법칙을 적어주세요',
  },
  progression: {
    label: '전개 방식',
    maxLength: 1000,
    multiline: true,
    placeholder: [
      '예: 역무실, 보관소, 개찰구 순서로 한 곳씩 탐색하며 단서를 모은다.',
      '첫차 시각이 다가올수록 사건의 속도를 높인다.',
      '보관소의 진실은 주인공이 무언가를 맡긴 뒤에야 드러난다.',
      '',
      '# 문체 톤',
      '새벽 역의 적막이 느껴지는 잔잔하고 쓸쓸한 문체로 쓴다.',
    ].join('\n'),
    description:
      '스토리의 진행 속도와 중요한 사건이 일어나는 조건을 정해요. 갈등을 천천히 쌓을지, 사건을 빠르게 이어갈지와 함께 원하는 말투와 분위기도 적어주세요',
  },
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
    label: '스토리 프로필',
    required: true,
    fields: ['title', 'oneLineIntro'],
  },
  {
    value: 'story',
    label: '스토리 설정',
    required: true,
    fields: ['world', 'progression'],
  },
  { value: 'protagonist', label: '주인공(나)', required: true, fields: [] },
  { value: 'supporting', label: '주변 인물', required: true, fields: [] },
  { value: 'start', label: '시작 상황 설정', required: true, fields: [] },
  { value: 'event', label: '주요 사건', required: false, fields: [] },
  { value: 'publish', label: '등록', required: true, fields: [] },
] as const satisfies readonly {
  value: string;
  label: string;
  required: boolean;
  fields: readonly GeneralStoryTextField[];
}[];

export type GeneralStoryTab = (typeof GENERAL_STORY_TABS)[number]['value'];

/** 스토리 프로필 탭의 커버 이미지(요청의 표지 `thumbnailObjectKey`) 입력 문구다. */
export const GENERAL_STORY_COVER_COPY = {
  label: '커버 이미지',
  description: '가로 3 : 세로 4 비율을 추천해요',
  fileRule: '(JPG, PNG, WEBP / 최대 5MB)',
  upload: '이미지 추가',
  change: '이미지 변경',
  remove: '삭제',
} as const;

/** 스토리 설정 탭의 분량 배분 슬라이더 문구다. */
export const GENERAL_STORY_LENGTH_RATIO_COPY = {
  label: '분량 배분',
  description: 'AI가 응답할 때 장면 묘사와 인물 대사를 어떤 비율로 쓸지 정해요',
  descriptionPart: '묘사',
  dialoguePart: '대사',
} as const;

/** 주인공(나)·주변 인물 탭의 입력 문구와 제한이다. 레이아웃은 간편 제작의 인물 입력을 따른다. */
export const GENERAL_STORY_CHARACTER_COPY = {
  basicInfoLabel: '기본 정보',
  nameLabel: '이름',
  genderLabel: '성별',
  genderPlaceholder: '성별',
  featureLabel: '특징',
  nameMaxLength: 30,
  featureMaxLength: 1000,
  protagonistNamePlaceholder: '예: 윤해솔',
  protagonistFeaturePlaceholder: [
    '예:',
    '## 역할',
    '막차에서 잘못 내려 유실역에 남겨진 회사원',
    '',
    '## 배경',
    '몇 해 전 동생과 크게 다툰 뒤로 연락을 끊고 지냈다.',
    '',
    '## 성격',
    '겁이 많지만 한번 정한 일은 끝까지 해내는 편이다.',
  ].join('\n'),
  supportingNamePlaceholders: [
    '예: 도하람',
    '예: 서은결',
    '예: 강태오',
    '예: 민소율',
    '예: 한시원',
  ],
  supportingFeaturePlaceholder: [
    '예:',
    '### 성격',
    '유실물 보관소를 지키는 무뚝뚝한 관리인이다.',
    '',
    '### 말투',
    '짧고 건조한 반말을 쓴다.',
    '',
    '### 동기',
    '보관소에 맡겨진 자신의 이름을 되찾고 싶어 한다.',
    '',
    '### 주인공을 대하는 태도',
    '처음에는 경계하지만, 주인공이 무언가를 맡기면 조금씩 돕는다.',
  ].join('\n'),
  imageLabel: '이미지',
  imageDescription: '가로 4 : 세로 3 비율을 추천해요',
  supportingMaxCount: 5,
  addSupporting: '인물 추가',
  remove: '삭제',
} as const;

/** 시작 상황 설정 탭의 문구·예시와 제한이다. 예시는 유실역 설정을 잇는다. */
export const GENERAL_STORY_START_COPY = {
  maxCount: 3,
  chipLabelMaxLength: 8,
  defaultLabel: (order: number) => `시작 상황 ${order}`,
  groupLabel: '시작 상황',
  add: '추가',
  remove: '삭제',
  name: {
    label: '상황 이름',
    maxLength: 100,
    placeholder: '예: 불 꺼진 승강장',
    description: '스토리 상세에서 시작 상황을 고를 때 보이는 이름이에요',
  },
  prologue: {
    label: '프롤로그',
    maxLength: 1000,
    placeholder: [
      '예: 막차 문이 닫히는 소리에 잠에서 깼다.',
      '열차는 이미 떠났고, 승강장에는 나 혼자 남았다.',
      '역명판에는 처음 보는 이름이 적혀 있었다. 유실역.',
    ].join('\n'),
    description:
      '채팅을 시작하면 첫 화면에 보이는 도입 글이에요. 주인공(나)이 스토리 속으로 들어서는 순간을 적어주세요',
  },
  situation: {
    label: '상황 설명',
    maxLength: 1000,
    placeholder: [
      '예: 텅 빈 승강장 끝, 유실물 보관소 창구에만 불이 켜져 있다.',
      '창구 안의 관리인 도하람이 주인공을 보고 말없이 장부를 덮는다.',
      '첫차까지 남은 시간은 네 시간이다.',
    ].join('\n'),
    description:
      'AI가 첫 장면을 이어 쓰는 출발점이에요. 주인공(나)이 마주한 상황과 주변 인물들이 하고 있는 일을 적어주세요',
  },
  suggestedInput: {
    label: '추천 입력',
    maxLength: 200,
    placeholders: [
      '예: *창구로 다가가 유리창을 가볍게 두드린다* 실례지만, 여기가 어디예요?',
      '예: *승강장을 따라 걸으며 출구 계단을 찾는다* 누구 없어요? 여기 사람 있어요!',
      '예: *휴대전화를 꺼내 시간과 전파를 확인한다* 전파가 하나도 안 잡히네…',
    ],
    description:
      '채팅 첫 화면에서 누르면 바로 보내지는 입력이에요. 주인공(나)이 할 수 있는 행동이나 말을 세 가지 적어주세요',
  },
  ending: {
    label: '엔딩',
    description:
      '이 시작 상황에서 스토리가 끝나는 결말이에요. 엔딩이 없으면 채팅이 끝나지 않고 계속 이어져요',
    maxCount: 3,
    add: '엔딩 추가',
    defaultLabel: (order: number) => `엔딩 ${order}`,
    name: {
      label: '엔딩 이름',
      maxLength: 100,
      placeholder: '예: 첫차',
      description: '엔딩에 도달했을 때 채팅과 스토리 상세에 보이는 이름이에요',
    },
    minTurns: {
      label: '최소 턴 수',
      max: 50,
      unit: '턴',
      placeholder: '예: 10',
      description: '이 턴 수를 넘기기 전에는 엔딩에 도달하지 않아요',
    },
    condition: {
      label: '달성 조건',
      maxLength: 500,
      placeholder:
        '예: 보관소에서 동생의 기억을 되찾고, 그 대가로 무언가를 맡긴 뒤 첫차에 오르면 이 엔딩에 도달한다',
      description:
        '어떤 상황이 되면 이 엔딩에 도달하는지 적어주세요. AI가 채팅 흐름을 보고 판단해요',
    },
    epilogue: {
      label: '에필로그',
      maxLength: 500,
      placeholder:
        '예: 되찾은 기억과 맡기고 온 것을 나란히 비추며, 새벽빛이 드는 첫차 안에서 잔잔하게 마무리한다',
      description:
        '엔딩에 도달했을 때 AI가 마지막 장면을 쓰는 방향이에요. 어떤 분위기로 마무리할지 적어주세요',
    },
  },
} as const;
