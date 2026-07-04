import { ChatMessageContent } from './chat-message-content';

type ChatMessageBubbleProps = {
  children: string;
};

export function UserMessageBubble({ children }: ChatMessageBubbleProps) {
  return (
    <div className="bg-muted p-4">
      <ChatMessageContent>{children}</ChatMessageContent>
    </div>
  );
}

export function AiMessageBubble({ children }: ChatMessageBubbleProps) {
  return (
    <div className="p-4">
      <ChatMessageContent>{children}</ChatMessageContent>
    </div>
  );
}
