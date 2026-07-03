import { parseTextSegments } from '@/lib/parse-text-segments';
import { cn } from '@/lib/utils';

type ChatTextSegmentsProps = {
  children?: string;
};

export function ChatTextSegments({ children }: ChatTextSegmentsProps) {
  return parseTextSegments(children ?? '').map((segment, segmentIndex) => (
    <span
      key={segmentIndex}
      className={cn(
        segment.emphasis && 'text-foreground-secondary',
        segment.bold && 'font-bold',
      )}>
      {segment.text}
    </span>
  ));
}
