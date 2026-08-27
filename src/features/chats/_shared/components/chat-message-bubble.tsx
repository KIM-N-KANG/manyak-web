import { Badge } from '@/components/ui/badge';
import { Message, MessageContent } from '@/components/ui/message';

import { ChatMessageContent } from './chat-message-content';

type ChatMessageBubbleProps = {
  children: string;
};

type AiMessageBubbleProps = ChatMessageBubbleProps & {
  endingName?: string | null;
};

export function UserMessageBubble({ children }: ChatMessageBubbleProps) {
  return (
    <Message>
      <MessageContent className="bg-muted p-4">
        <ChatMessageContent>{children}</ChatMessageContent>
      </MessageContent>
    </Message>
  );
}

export function AiMessageBubble({
  children,
  endingName,
}: AiMessageBubbleProps) {
  return (
    <Message>
      <MessageContent className="p-4">
        {endingName ? (
          <Badge
            variant="secondary"
            aria-live="polite"
            className="h-auto max-w-full bg-primary/10 px-2.5 py-1 text-sm whitespace-normal text-primary">
            엔딩 · {endingName}
          </Badge>
        ) : null}
        <ChatMessageContent>{children}</ChatMessageContent>
      </MessageContent>
    </Message>
  );
}
