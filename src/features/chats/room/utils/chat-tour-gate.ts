type ChatTourGateParams = {
  isReady: boolean;
  turnCount: number;
  isStreaming: boolean;
  seen: boolean;
};

/**
 * 채팅 화면 안내 투어의 자동 노출 조건을 판정한다.
 * 프롤로그와 첫 추천만 있는 초기 상태(턴 0개, 스트리밍 아님)에서
 * 아직 투어를 보지 않은 사용자에게만 연다.
 *
 * @param params 로딩 완료 여부·턴 수·스트리밍 여부·열람 여부
 * @returns 자동으로 투어를 열어야 하면 true
 */
export function shouldAutoOpenChatTour({
  isReady,
  turnCount,
  isStreaming,
  seen,
}: ChatTourGateParams): boolean {
  return isReady && turnCount === 0 && !isStreaming && !seen;
}
