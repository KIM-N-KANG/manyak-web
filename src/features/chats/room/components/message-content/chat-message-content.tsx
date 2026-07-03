import { cn } from '@/lib/utils';

import { ChatTextSegments } from './chat-text-segments';

type ChatMessageContentProps = {
  children?: string;
  className?: string;
};

export function ChatMessageContent({
  children,
  className,
}: ChatMessageContentProps) {
  return (
    <p
      className={cn(
        'font-maruburi text-base leading-loose break-words whitespace-pre-wrap',
        className,
      )}>
      <ChatTextSegments>{children}</ChatTextSegments>
    </p>
  );
}
