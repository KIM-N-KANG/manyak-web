type StorylineTextProps = {
  children?: string;
};

const STORYLINE_EXPLICIT_LINE_BREAK_PATTERN = /\r?\n+/u;
const STORYLINE_SENTENCE_BREAK_PATTERN = /(?<=[.!?。！？…])\s+/u;

const getStorylineLines = (storyline?: string) =>
  (storyline ?? '')
    .split(STORYLINE_EXPLICIT_LINE_BREAK_PATTERN)
    .flatMap((line) => line.split(STORYLINE_SENTENCE_BREAK_PATTERN))
    .map((line) => line.trim())
    .filter(Boolean);

export function StorylineText({ children }: StorylineTextProps) {
  const lines = getStorylineLines(children);

  return (
    <div className="flex flex-col gap-3 font-maruburi text-base leading-loose">
      {lines.map((line, index) => (
        <p key={`${index}-${line}`}>{line}</p>
      ))}
    </div>
  );
}
