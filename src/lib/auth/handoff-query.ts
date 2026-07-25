/**
 * 외부 브라우저 랜딩 URL이 핸드오프 코드를 싣는 쿼리 파라미터 이름.
 * 인앱 화면은 '외부 브라우저에서 열기'가 현재 주소를 그대로 넘겨야 해서 이 쿼리를
 * 유지한다. 따라서 코드는 URL에 살아 있는 시간이 길고, 분석·Referer 등 URL이 새어
 * 나가는 경로마다 {@link redactHandoffCode}로 가려야 한다.
 */
export const HANDOFF_QUERY_PARAM = 'handoff';

/** 가려진 코드 자리에 남길 표식. 값이 있었다는 사실만 분석에 남긴다. */
export const HANDOFF_REDACTED_VALUE = '[redacted]';

const HANDOFF_QUERY_PATTERN = new RegExp(
  `([?&]${HANDOFF_QUERY_PARAM}=)[^&#]*`,
  'gi',
);

/**
 * 문자열에 담긴 핸드오프 코드 원문을 표식으로 바꾼다.
 * URL 파싱 대신 치환으로 처리해 상대 경로·잘린 URL 등 어떤 형태든 안전하게 다룬다.
 *
 * @param value 코드가 섞였을 수 있는 문자열(주로 URL)
 * @returns 코드를 가린 문자열. 코드가 없으면 원문 그대로다
 */
export function redactHandoffCode(value: string): string {
  return value.replace(HANDOFF_QUERY_PATTERN, `$1${HANDOFF_REDACTED_VALUE}`);
}
