/** 피드백 본문의 최대 글자 수. 입력을 이 길이에서 자르고 글자 수 표시의 기준으로 쓴다. */
export const FEEDBACK_BODY_MAX_LENGTH = 500;

/** 회신 이메일의 최대 글자 수. 이메일 주소의 통상 최대 길이(로컬 64자, `@`, 도메인 255자)다. */
export const FEEDBACK_EMAIL_MAX_LENGTH = 320;

export const FEEDBACK_TITLE_LINES = [
  '써보면서 아쉬웠던 점이 있나요?',
  '불편한 점이나 바라는 기능을 알려주세요',
] as const;

export const FEEDBACK_DESCRIPTION =
  '보내주신 피드백은 다음 개선에 꼼꼼히 참고할게요';
