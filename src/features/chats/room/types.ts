import type { ContinueChatRequest } from '@/api/generated/models';
import type { ChatMessageSegment } from '@/features/chats/_shared/utils/chat-message-segments';

export type ChatChoiceSelection = Required<
  Pick<ContinueChatRequest, 'sourceTurnId' | 'choiceOrder'>
>;

export type StreamingTurn = {
  userInput: string;
  segments: ChatMessageSegment[];
  /** 전송 시점의 확정 턴 개수. refetch로 턴이 늘어나면 스트리밍 블록을 숨기는 기준(재생성은 미사용) */
  baseTurnCount?: number;
};
