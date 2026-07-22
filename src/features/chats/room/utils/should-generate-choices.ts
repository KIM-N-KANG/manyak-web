import type { ChatTurnResponse } from '@/api/generated/models';

type ShouldGenerateChoicesInput = {
  enabled: boolean;
  isStreaming: boolean;
  lastTurn: ChatTurnResponse | undefined;
};

/**
 * 선택지 생성 API를 지금 호출해야 하는지 판정한다.
 * 토글 on이고 스트리밍 중이 아니며, 마지막 턴이 존재하고(id 포함)
 * 그 턴에 선택지가 없을 때만 true다(스펙 §3-6 추천 입력 토글).
 *
 * @param input 토글 상태·스트리밍 여부·마지막 턴
 * @returns 선택지 생성 API를 호출해야 하면 true
 */
export function shouldGenerateChoices({
  enabled,
  isStreaming,
  lastTurn,
}: ShouldGenerateChoicesInput): boolean {
  if (!enabled || isStreaming) {
    return false;
  }

  if (lastTurn?.id == null) {
    return false;
  }

  return (lastTurn.choices ?? []).length === 0;
}
