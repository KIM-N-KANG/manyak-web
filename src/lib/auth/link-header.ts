/**
 * 연동 요청에 링크 코드를 싣는 헤더 이름. 코드는 비밀값이라 URL에 싣지 않는다
 * (서버가 요청 URI를 구조화 로그·Sentry에 남긴다 — 스펙 §4-5).
 */
export const LINK_CODE_HEADER = 'X-Manyak-Link-Code';
