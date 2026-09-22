type ChatTourGateParams = {
  isReady: boolean;
  turnCount: number;
  isStreaming: boolean;
  seen: boolean;
  /** 게스트 동의 시트가 열려 있는지. 전송 시도가 시트에 붙잡힌 상태라 투어를 겹쳐 열지 않는다. */
  isConsentOpen: boolean;
};

/**
 * 채팅 화면 안내 투어의 자동 노출 조건을 판정한다.
 * 프롤로그와 첫 추천만 있는 초기 상태(턴 0개, 스트리밍 아님)에서
 * 아직 투어를 보지 않은 사용자에게만 연다. 게스트 동의 시트가 열려 있으면 전송 시도가
 * 진행 중이라 열지 않는다. 시트가 닫힌 뒤 전송이 나가면 스트리밍·턴 조건에 걸려 이번
 * 채팅에서는 건너뛰고, 열람 표시가 남지 않아 다음 새 채팅에서 연다.
 *
 * @param params 로딩 완료 여부·턴 수·스트리밍 여부·열람 여부·동의 시트 열림 여부
 * @returns 자동으로 투어를 열어야 하면 true
 */
export function shouldAutoOpenChatTour({
  isReady,
  turnCount,
  isStreaming,
  seen,
  isConsentOpen,
}: ChatTourGateParams): boolean {
  return isReady && turnCount === 0 && !isStreaming && !seen && !isConsentOpen;
}
