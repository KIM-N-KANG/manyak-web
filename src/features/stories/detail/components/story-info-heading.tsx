import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type StoryInfoHeadingProps = {
  title: string;
  children: string;
};

export function StoryInfoHeading({ title, children }: StoryInfoHeadingProps) {
  return (
    <div className="flex items-center gap-0.5">
      <h3 className="font-semibold">{title}</h3>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`${title} 안내`}
              className="text-foreground-secondary"
            />
          }>
          <HugeiconsIcon
            icon={InformationCircleIcon}
            className="size-4"
            aria-hidden="true"
          />
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-auto max-w-60 gap-0 px-3 py-2">
          {children}
        </PopoverContent>
      </Popover>
    </div>
  );
}
