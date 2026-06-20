import { cn } from '@/lib/utils';

import { parseChatSegments } from '../lib/chat-text';

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
        'font-maruburi text-base leading-loose whitespace-pre-wrap',
        className,
      )}>
      {parseChatSegments(children ?? '').map((segment, segmentIndex) => (
        <span
          key={segmentIndex}
          className={cn(
            segment.emphasis && 'text-foreground-secondary',
            segment.bold && 'font-bold',
          )}>
          {segment.text}
        </span>
      ))}
    </p>
  );
}
