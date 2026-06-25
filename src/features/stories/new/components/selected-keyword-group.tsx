import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

import type { SelectedKeywordGroup as SelectedKeywordGroupModel } from '../types';

type SelectedKeywordGroupProps = {
  group: SelectedKeywordGroupModel;
};

export function SelectedKeywordGroup({ group }: SelectedKeywordGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{group.label}</Label>
      <div className="flex flex-wrap gap-2">
        {group.keywords.map((keyword, index) => (
          <Badge
            key={`${keyword}-${index}`}
            variant="secondary"
            className="h-auto rounded-sm px-2 py-1.75 text-xs">
            {keyword}
          </Badge>
        ))}
      </div>
    </div>
  );
}
