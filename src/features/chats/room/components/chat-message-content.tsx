import { cn } from '@/lib/utils';

import { getContentLines, parseEmphasisSegments } from '../lib/chat-text';

type ChatMessageContentProps = {
  children?: string;
  className?: string;
};

export function ChatMessageContent({
  children,
  className,
}: ChatMessageContentProps) {
  const lines = getContentLines(children ?? '');

  return (
    <div
      className={cn(
        'flex flex-col gap-3 font-maruburi text-base leading-loose',
        className,
      )}>
      {lines.map((line, lineIndex) => (
        <p key={`${lineIndex}-${line}`}>
          {parseEmphasisSegments(line).map((segment, segmentIndex) => (
            <span
              key={segmentIndex}
              className={cn(segment.emphasis && 'text-foreground-secondary')}>
              {segment.text}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
