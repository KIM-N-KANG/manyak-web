import { cn } from '@/lib/utils';

import { parseEmphasisSegments } from '../lib/chat-text';

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
      {parseEmphasisSegments(children ?? '').map((segment, segmentIndex) => (
        <span
          key={segmentIndex}
          className={cn(segment.emphasis && 'text-foreground-secondary')}>
          {segment.text}
        </span>
      ))}
    </p>
  );
}
