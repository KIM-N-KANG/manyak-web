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
          <span
            key={`${tag}-${index}`}
            className="inline-flex h-10 items-center rounded-md border border-primary bg-primary/10 px-3.5 text-sm font-medium whitespace-nowrap text-primary">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
