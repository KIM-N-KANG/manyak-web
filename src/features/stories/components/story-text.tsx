import { cn } from '@/lib/utils';

type StoryTextProps = {
  children?: string;
  font?: 'default' | 'maruburi';
};

const STORY_TEXT_EXPLICIT_LINE_BREAK_PATTERN = /\r?\n+/u;
const STORY_TEXT_SENTENCE_BREAK_PATTERN = /(?<=[.!?。！？…])\s+/u;

const getStoryTextLines = (story?: string) =>
  (story ?? '')
    .split(STORY_TEXT_EXPLICIT_LINE_BREAK_PATTERN)
    .flatMap((line) => line.split(STORY_TEXT_SENTENCE_BREAK_PATTERN))
    .map((line) => line.trim())
    .filter(Boolean);

export function StoryText({ children, font = 'default' }: StoryTextProps) {
  const lines = getStoryTextLines(children);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 text-base leading-loose',
        font === 'maruburi' && 'font-maruburi',
      )}>
      {lines.map((line, index) => (
        <p key={`${index}-${line}`}>{line}</p>
      ))}
    </div>
  );
}
