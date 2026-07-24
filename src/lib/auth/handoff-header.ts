/**
 * 확인·상태 조회 시 핸드오프 코드를 싣는 요청 헤더 이름(스펙 §4-3-5).
 * 코드는 비밀값이라 URL path·쿼리에 남기지 않고 헤더로만 전달하는 것이 계약이다.
 * next/headers를 끌어오지 않도록 서버·클라이언트 공용의 이 모듈에 둔다.
 */
export const HANDOFF_CODE_HEADER = 'X-Manyak-Handoff-Code';
