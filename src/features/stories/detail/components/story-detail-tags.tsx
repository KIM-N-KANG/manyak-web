import { Badge } from '@/components/ui/badge';

type StoryDetailTagsProps = {
  genres: string[];
};

export function StoryDetailTags({ genres }: StoryDetailTagsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {genres.map((genre) => (
        <Badge
          key={genre}
          variant="secondary"
          className="h-auto max-w-full px-3 py-1 text-sm text-foreground-secondary">
          <span className="truncate">{genre}</span>
        </Badge>
      ))}
    </div>
  );
}
