import { parseTextSegments } from '@/lib/parse-text-segments';
import { cn } from '@/lib/utils';

type TextContentProps = {
  children?: string;
  font?: 'default' | 'maruburi';
  size?: 'sm' | 'base';
};

export function TextContent({
  children,
  font = 'default',
  size = 'base',
}: TextContentProps) {
  return (
    <p
      className={cn(
        'whitespace-pre-wrap',
        size === 'sm' ? 'text-sm' : 'text-base',
        font === 'maruburi' ? 'font-maruburi' : 'leading-loose',
      )}>
      {parseTextSegments(children ?? '').map((segment, index) => (
        <span
          key={index}
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
