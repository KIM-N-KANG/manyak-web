import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

type SelectedKeywordsSummaryProps = {
  keywords: string[];
};

export function SelectedKeywordsSummary({
  keywords,
}: SelectedKeywordsSummaryProps) {
  if (keywords.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      <Label>키워드</Label>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <Badge
            key={`${keyword}-${index}`}
            variant="secondary"
            className="h-auto rounded-full px-3 py-1.75 text-xs">
            {keyword}
          </Badge>
        ))}
      </div>
    </div>
  );
}
