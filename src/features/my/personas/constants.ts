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

export const PERSONA_CREATE_ERROR_COPY = {
  name: '이름을 입력해 주세요',
  gender: '성별을 선택해 주세요',
  feature: '특징을 입력해 주세요',
} as const;
