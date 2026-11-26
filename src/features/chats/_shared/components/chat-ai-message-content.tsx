import { cn } from '@/lib/utils';

import type { ChatMessageSegment } from '../utils/chat-message-segments';
import {
  getChatImageAlt,
  parseChatMessageSegments,
} from '../utils/chat-message-segments';
import { ChatCharacterImage } from './chat-character-image';
import { ChatMessageContent } from './chat-message-content';

/** 저장된 본문(`content`)과 스트리밍 중 누적한 조각(`segments`) 중 하나만 받는다. */
type ChatAiMessageContentProps =
  | {
      /** 이미지 마커가 섞인 저장 본문. 렌더할 때 조각으로 파싱한다. */
      content: string;
      segments?: never;
      imageLoading?: 'eager' | 'lazy';
      /** 인물이나 장면 이미지를 탭해 뷰어가 열릴 때 호출된다(분석 이벤트용). */
      onCharacterImageZoom?: () => void;
    }
  | {
      content?: never;
      /** 스트리밍 중 이벤트를 받아 이미 나눈 조각. 다시 파싱하지 않는다. */
      segments: readonly ChatMessageSegment[];
      imageLoading?: 'eager' | 'lazy';
      onCharacterImageZoom?: () => void;
    };

/**
 * 텍스트 조각과 인물, 장면 이미지를 본문 순서대로 번갈아 그리는 AI 응답 본문.
 * 채팅방의 턴, 스트리밍 턴, 프롤로그와 공유 채팅 화면이 함께 쓴다.
 */
export function ChatAiMessageContent({
  content,
  segments,
  imageLoading,
  onCharacterImageZoom,
}: ChatAiMessageContentProps) {
  const messageSegments = segments ?? parseChatMessageSegments(content);

  return (
    <div className="flex flex-col gap-5 px-4">
      {messageSegments.map((segment, index) =>
        segment.type === 'text' ? (
          <ChatMessageContent key={`text-${index}`}>
            {segment.content}
          </ChatMessageContent>
        ) : (
          <ChatCharacterImage
            key={`image-${index}`}
            alt={getChatImageAlt(segment)}
            imageUrl={segment.imageUrl}
            loading={imageLoading}
            onZoom={onCharacterImageZoom}
            className={cn(index > 0 && 'mt-5')}
          />
        ),
      )}
    </div>
  );
}
