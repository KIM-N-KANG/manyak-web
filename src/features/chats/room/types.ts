import type { ContinueChatRequest } from '@/api/generated/models';
import type { ChatMessageSegment } from '@/features/chats/_shared/utils/chat-message-segments';

/**
 * 선택지에서 온 전송에 싣는 서버 선택 메타데이터. `choiceOrder` 는 1부터 세는 서버 순번으로, 화면의 0부터 세는
 * `position` 에서 `createChoiceSelection` 이 바꾼다. 원본 턴이 없는 시작 추천 입력에는 싣지 않는다.
 */
export type ChatChoiceSelection = Required<
  Pick<ContinueChatRequest, 'sourceTurnId' | 'choiceOrder'>
>;

/** 생성 중인 턴의 화면 상태. 생성이 끝나 확정 턴으로 바뀌면 사라진다. */
export type StreamingTurn = {
  /** 사용자 입력. 재생성은 대상 턴의 원래 입력, 입력 수정은 고친 입력이다. */
  userInput: string;
  /** 지금까지 받은 텍스트와 이미지 조각. 재연결하면 이벤트를 처음부터 다시 받으므로 비운다. */
  segments: ChatMessageSegment[];
  /** 전송 시점의 확정 턴 개수. refetch로 턴이 늘어나면 스트리밍 블록을 숨기는 기준(재생성은 미사용) */
  baseTurnCount?: number;
  /** 전송 시점의 실시간 이미지 설정. 첫 이벤트 전 로딩에 장면 썸네일 자리를 보일지 정한다 */
  realtimeImage?: boolean;
};

/** 사용자 입력을 그 자리에서 고치는 중인 턴과 편집 동작. */
export type TurnEditor = {
  turnId: number;
  draft: string;
  onChange: (draft: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};
