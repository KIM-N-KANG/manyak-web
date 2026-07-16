import type { StreamingTurn } from '../types';

/**
 * 진행 중인 스트리밍 턴이 refetch로 도착한 확정 턴에 이미 대체됐는지 판정한다.
 *
 * 스트림 완료 시 refetch(턴 추가)와 스트리밍 상태 해제가 별도 렌더로 갈라지면
 * 스트리밍 블록이 한 프레임 먼저 사라져 콘텐츠가 순간 수축하고 스크롤이 위로
 * 튄다. 확정 턴이 추가된 렌더에서 스트리밍 블록을 함께 숨겨 원자적으로
 * 교체하기 위해 사용한다.
 *
 * @param streamingTurn 진행 중인 스트리밍 턴
 * @param turnCount 현재 렌더의 확정 턴 개수
 * @returns 확정 턴에 이미 대체됐으면 true
 */
export function isStreamingTurnSuperseded(
  streamingTurn: StreamingTurn,
  turnCount: number,
): boolean {
  return (
    streamingTurn.baseTurnCount != null &&
    turnCount > streamingTurn.baseTurnCount
  );
}
