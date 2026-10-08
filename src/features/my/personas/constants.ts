/** 페르소나 이름 상한. 서버는 앞뒤 공백을 뺀 1~20자를 받는다. */
export const PERSONA_NAME_MAX_LENGTH = 20;

/** 페르소나 특징 상한. 성별 절을 붙여도 서버 소개(`description`) 상한 1,000자 안에 든다. */
export const PERSONA_FEATURE_MAX_LENGTH = 500;

export const PERSONA_CREATE_COPY = {
  headerTitle: '페르소나 생성',
  title: '어떤 사람으로 플레이할까요?',
  description: '만든 페르소나는 어떤 스토리에서든 고를 수 있어요',
  basicInfoLabel: '기본 정보',
  nameLabel: '이름',
  namePlaceholder: '예: 윤해솔',
  genderLabel: '성별',
  genderPlaceholder: '성별',
  basicInfoDescription: '스토리 속에서 불릴 이름과 성별이에요',
  featureLabel: '특징',
  featurePlaceholder: [
    '예:',
    '## 성격',
    '겁이 많지만 한번 정한 일은 끝까지 해내는 편이다.',
    '',
    '## 말투',
    '평소엔 존댓말을 쓰지만 친해지면 장난을 자주 친다.',
  ].join('\n'),
  featureDescription: '어떤 사람인지에 따라 인물들의 반응이 달라져요',
  submit: '생성하기',
  submitting: '페르소나 생성 중',
} as const;

export const PERSONA_EDIT_COPY = {
  headerTitle: '페르소나 수정',
  description: '수정한 내용은 새로 시작하는 채팅부터 적용돼요',
  submit: '저장하기',
  submitting: '페르소나 저장 중',
  notFound: '페르소나를 찾을 수 없어요',
} as const;

export const PERSONA_LIST_COPY = {
  headerTitle: '페르소나 관리',
  empty: '아직 만든 페르소나가 없어요',
  loadFailed: '페르소나를 불러오지 못했어요',
  loading: '페르소나 불러오는 중',
  create: '페르소나 추가',
  optionsKind: '페르소나',
  optionsTrigger: (name: string) => `${name} 페르소나 옵션`,
  edit: '수정하기',
  delete: '삭제하기',
  deleteConfirmTitle: '페르소나를 삭제할까요?',
  deleteConfirmDescription:
    '이 페르소나로 진행 중인 채팅은 그대로 이어갈 수 있어요',
} as const;

export const PERSONA_CREATE_ERROR_COPY = {
  name: '이름을 입력해 주세요',
  gender: '성별을 선택해 주세요',
  feature: '특징을 입력해 주세요',
} as const;
