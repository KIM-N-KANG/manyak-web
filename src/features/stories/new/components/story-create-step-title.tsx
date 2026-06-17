import { cn } from '@/lib/utils';

type StoryCreateStepTitleProps = {
  titleLines: readonly string[];
  description: string;
  className?: string;
};

export function StoryCreateStepTitle({
  titleLines,
  description,
  className,
}: StoryCreateStepTitleProps) {
  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      <div className="text-xl font-semibold">
        {titleLines.map((titleLine) => (
          <p key={titleLine}>{titleLine}</p>
        ))}
      </div>
      <p className="text-foreground-secondary">{description}</p>
    </div>
  );
}
