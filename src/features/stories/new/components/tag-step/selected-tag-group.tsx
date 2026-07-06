import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

import type { SelectedTagGroup as SelectedTagGroupModel } from '../../types';

type SelectedTagGroupProps = {
  group: SelectedTagGroupModel;
};

export function SelectedTagGroup({ group }: SelectedTagGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{group.label}</Label>
      <div className="flex flex-wrap gap-1">
        {group.tags.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="secondary"
            className="h-auto px-2.5 py-1 text-sm">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
