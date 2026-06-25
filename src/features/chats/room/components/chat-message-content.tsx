import { parseTextSegments } from '@/lib/parse-text-segments';
import { cn } from '@/lib/utils';

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
      {parseTextSegments(children ?? '').map((segment, segmentIndex) => (
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
