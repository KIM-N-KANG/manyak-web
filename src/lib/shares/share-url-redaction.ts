/** 가려진 공유 식별자 자리에 남길 표식. 값이 있었다는 사실만 관측에 남긴다. */
export const SHARE_ID_REDACTED_VALUE = '[redacted]';

/**
 * 공유 식별자가 실리는 경로 구간을 잡는 패턴.
 *
 * 화면 경로(`/share/{shareId}`)와 백엔드 API 경로(`/api/v1/shares/{shareId}`)를 모두
 * 덮는다. API URL은 오류 캡처 시 `api_url` 태그로 올라가므로 같은 누출 경로다.
 * 절대 URL·상대 경로·쿼리나 해시가 붙은 형태를 모두 덮도록 경로 구분자와 공백을
 * 경계로 쓴다.
 */
const SHARE_PATH_PATTERN = /(\/shares?\/)[^/?#\s]+/gi;

/**
 * 문자열에 담긴 공유 열람 토큰을 표식으로 바꾼다.
 *
 * `shareId`는 곧 열람 수단이라(백엔드 §4-3-11) 관측 저장소에 남으면 비공개 대화에
 * 접근할 수 있는 경로가 된다. URL 파싱 대신 치환으로 처리해 상대 경로·잘린 URL 등
 * 어떤 형태든 안전하게 다룬다.
 *
 * @param value 공유 URL이 섞였을 수 있는 문자열
 * @returns 식별자를 가린 문자열. 대상이 없으면 원문 그대로다
 */
export function redactShareId(value: string): string {
  return value.replace(SHARE_PATH_PATTERN, `$1${SHARE_ID_REDACTED_VALUE}`);
}
