import { cn } from '@/lib/utils';

type TextContentProps = {
  children?: string;
  font?: 'default' | 'maruburi';
  size?: 'sm' | 'base';
};

const TEXT_EXPLICIT_LINE_BREAK_PATTERN = /\r?\n+/u;
const TEXT_SENTENCE_BREAK_PATTERN = /(?<=[.!?。！？…])\s+/u;

const getTextLines = (text?: string) =>
  (text ?? '')
    .split(TEXT_EXPLICIT_LINE_BREAK_PATTERN)
    .flatMap((line) => line.split(TEXT_SENTENCE_BREAK_PATTERN))
    .map((line) => line.trim())
    .filter(Boolean);

export function TextContent({
  children,
  font = 'default',
  size = 'base',
}: TextContentProps) {
  const lines = getTextLines(children);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 leading-loose',
        size === 'sm' ? 'gap-2.5 text-sm' : 'text-base',
        font === 'maruburi' && 'font-maruburi',
      )}>
      {lines.map((line, index) => (
        <p key={`${index}-${line}`}>{line}</p>
      ))}
    </div>
  );
}
