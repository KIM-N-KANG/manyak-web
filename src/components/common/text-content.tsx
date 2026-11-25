import { parseTextSegments } from '@/lib/parse-text-segments';
import { cn } from '@/lib/utils';

type TextContentProps = {
  children?: string;
  font?: 'default' | 'maruburi';
  size?: 'sm' | 'base';
};

/**
 * 강조 표기가 섞인 본문을 줄바꿈을 살려 그린다. `*...*`는 보조 색, `**...**`는 굵게 표시한다.
 *
 * @see parseTextSegments 강조 표기 문법
 */
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
        font === 'maruburi' && 'font-maruburi leading-7',
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
