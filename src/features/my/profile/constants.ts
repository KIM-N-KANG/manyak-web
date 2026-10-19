/** 닉네임 길이 범위. 서버는 입력값을 다듬지 않고 그대로 센다. */
export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

export const PROFILE_EDIT_COPY = {
  headerTitle: '프로필 수정',
  imageButtonLabel: '프로필 이미지 바꾸기',
  nicknameLabel: '닉네임',
  nicknameDescription: '한글, 영문, 숫자로 2~20자까지 쓸 수 있어요',
  submit: '저장하기',
  submitting: '프로필 저장 중',
  loadFailed: '프로필을 불러오지 못했어요',
  retry: '다시 시도하기',
} as const;

export const PROFILE_PRESET_SHEET_COPY = {
  title: '프로필 이미지',
  loadFailed: '이미지를 불러오지 못했어요',
  retry: '다시 시도하기',
} as const;

export const NICKNAME_ERROR_COPY = {
  tooShort: '닉네임은 2자 이상 입력해 주세요',
  invalidCharacter: '한글, 영문, 숫자만 쓸 수 있어요',
  taken: '이미 사용 중인 닉네임이에요',
  rejected: '쓸 수 없는 닉네임이에요',
} as const;
