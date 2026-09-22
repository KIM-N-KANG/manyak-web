/**
 * 푸시 페이로드의 수신자가 현재 회원인지 판정한다. 푸시는 회원이 아니라 기기(토큰)로
 * 도착하므로, 로그아웃 뒤 남은 토큰이나 늦게 도착한 이전 회원 대상 메시지가 다른
 * 회원 화면에 뜨지 않도록 서버가 실은 `recipientId`와 세션 회원 ID를 대조한다.
 *
 * @param recipientId 페이로드 data의 수신 회원 공개 ID
 * @param currentUserId 현재 세션의 회원 공개 ID
 * @returns 둘 다 있고 같으면 true
 */
export function isPushForCurrentUser(
  recipientId: string | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(recipientId) && recipientId === currentUserId;
}
