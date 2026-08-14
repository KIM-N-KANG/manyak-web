import type { ChatChoiceSelection } from '../types';

/**
 * 화면의 0-based 선택지 위치를 서버의 1-based 순번으로 바꾼다.
 * 시작 추천 입력처럼 원본 턴이 없으면 선택 메타데이터를 보내지 않는다.
 *
 * @param sourceTurnId 선택지가 달린 원본 턴 ID
 * @param position 화면에서 사용하는 0-based 선택지 위치
 * @returns 서버 전송용 선택 메타데이터 또는 원본 턴이 없을 때 undefined
 */
export function createChoiceSelection(
  sourceTurnId: number | undefined,
  position: number,
): ChatChoiceSelection | undefined {
  if (sourceTurnId == null) {
    return undefined;
  }

  return {
    sourceTurnId,
    choiceOrder: position + 1,
  };
}
