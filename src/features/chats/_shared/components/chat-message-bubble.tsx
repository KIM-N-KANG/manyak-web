import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Message, MessageContent } from '@/components/ui/message';

import { ChatMessageContent } from './chat-message-content';

type ChatMessageBubbleProps = {
  children: string;
};

type AiMessageBubbleProps = {
  children: ReactNode;
  endingName?: string | null;
};

export function UserMessageBubble({ children }: ChatMessageBubbleProps) {
  return (
    <Message>
      <MessageContent className="bg-muted px-4 py-5">
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
      <MessageContent className="gap-2.5 py-5">
        {endingName ? (
          <div className="px-4">
            <Badge
              variant="secondary"
              aria-live="polite"
              className="h-auto max-w-full bg-primary/10 px-2.5 py-1 text-sm whitespace-normal text-primary">
              엔딩 · {endingName}
            </Badge>
          </div>
        ) : null}
        {children}
      </MessageContent>
    </Message>
  );
}
