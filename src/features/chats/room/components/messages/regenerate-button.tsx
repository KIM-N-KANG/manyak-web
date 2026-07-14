import { Refresh04Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';

type RegenerateButtonProps = {
  onClick: () => void;
};

export function RegenerateButton({ onClick }: RegenerateButtonProps) {
  return (
    <div className="-ml-1 px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-foreground-secondary"
        onClick={onClick}>
        <HugeiconsIcon icon={Refresh04Icon} aria-hidden="true" />
      </Button>
    </div>
  );
}
