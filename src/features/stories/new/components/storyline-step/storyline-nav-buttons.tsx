import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';

type StorylineNavButtonsProps = {
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function StorylineNavButtons({
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: StorylineNavButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        disabled={!canGoPrev}
        aria-label="이전 스토리라인"
        onClick={onPrev}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        disabled={!canGoNext}
        aria-label="다음 스토리라인"
        onClick={onNext}>
        <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
      </Button>
    </div>
  );
}
