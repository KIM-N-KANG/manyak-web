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
          className="h-auto px-2.5 py-1 text-sm text-foreground-secondary">
          {genre}
        </Badge>
      ))}
    </div>
  );
}
