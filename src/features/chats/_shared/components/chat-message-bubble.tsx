import { Message, MessageContent } from '@/components/ui/message';

import { ChatMessageContent } from './chat-message-content';

type ChatMessageBubbleProps = {
  children: string;
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

export function AiMessageBubble({ children }: ChatMessageBubbleProps) {
  return (
    <Message>
      <MessageContent className="p-4">
        <ChatMessageContent>{children}</ChatMessageContent>
      </MessageContent>
    </Message>
  );
}
