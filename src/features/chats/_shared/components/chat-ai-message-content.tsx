import type { ChatMessageSegment } from '../utils/chat-message-segments';
import { parseChatMessageSegments } from '../utils/chat-message-segments';
import { ChatCharacterImage } from './chat-character-image';
import { ChatMessageContent } from './chat-message-content';

type ChatAiMessageContentProps =
  | {
      content: string;
      segments?: never;
      imageLoading?: 'eager' | 'lazy';
    }
  | {
      content?: never;
      segments: readonly ChatMessageSegment[];
      imageLoading?: 'eager' | 'lazy';
    };

export function ChatAiMessageContent({
  content,
  segments,
  imageLoading,
}: ChatAiMessageContentProps) {
  const messageSegments = segments ?? parseChatMessageSegments(content);

  return (
    <div className="flex flex-col gap-4 px-4">
      {messageSegments.map((segment, index) =>
        segment.type === 'text' ? (
          <ChatMessageContent key={`text-${index}`}>
            {segment.content}
          </ChatMessageContent>
        ) : (
          <ChatCharacterImage
            key={`character-image-${index}`}
            name={segment.name}
            imageUrl={segment.imageUrl}
            loading={imageLoading}
          />
        ),
      )}
    </div>
  );
}
