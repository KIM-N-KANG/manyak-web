import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Message, MessageContent } from '@/components/ui/message';

import { ChatMessageContent } from './chat-message-content';

type ChatMessageBubbleProps = {
  children: string;
  /** 입력 아래 오른쪽에 두는 버튼. AI 응답 아래 버튼 행과 같은 간격이며 채팅방의 입력 수정에 쓴다. */
  action?: ReactNode;
};

type AiMessageBubbleProps = {
  children: ReactNode;
  endingName?: string | null;
};

export function UserMessageBubble({
  children,
  action,
}: ChatMessageBubbleProps) {
  return (
    <Message>
      <MessageContent className="bg-muted px-4 py-5">
        <ChatMessageContent>{children}</ChatMessageContent>
        {action ? (
          <div className="mt-2.5 -mr-1 flex justify-end">{action}</div>
        ) : null}
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
