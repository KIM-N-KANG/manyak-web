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
      <div className="flex flex-wrap gap-2">
        {group.tags.map((tag, index) => (
          <Badge
            key={`${tag}-${index}`}
            variant="secondary"
            className="h-auto rounded-sm px-2 py-1.75 text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
