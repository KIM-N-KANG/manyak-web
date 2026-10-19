import { NICKNAME_ERROR_COPY, NICKNAME_MIN_LENGTH } from '../constants';

/** 서버 닉네임 규칙의 허용 문자. 완성형 한글, 영문, 숫자만이며 공백과 자모 단독은 거부한다. */
const ALLOWED_NICKNAME = /^[가-힣A-Za-z0-9]*$/;

/**
 * 저장 전에 닉네임을 서버 규칙(2~20자, 완성형 한글, 영문, 숫자)으로 검사한다. 상한은 입력 칸이 막는다.
 *
 * @param nickname 입력값 그대로의 닉네임
 * @returns 규칙을 어기면 칸 아래에 보일 오류 문구, 지키면 undefined
 */
export function validateNickname(nickname: string): string | undefined {
  if (!ALLOWED_NICKNAME.test(nickname)) {
    return NICKNAME_ERROR_COPY.invalidCharacter;
  }

  if (nickname.length < NICKNAME_MIN_LENGTH) {
    return NICKNAME_ERROR_COPY.tooShort;
  }

  return undefined;
}
