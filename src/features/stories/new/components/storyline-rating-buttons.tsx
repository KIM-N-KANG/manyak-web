import { ThumbsUpIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';

import type { StorylineRating } from '../types';

const RATING_BUTTONS = [
  {
    rating: 'GOOD',
    ariaLabel: '이 스토리라인 좋아요',
    activeVariant: 'primaryOutline',
    iconClassName: undefined,
  },
  {
    rating: 'BAD',
    ariaLabel: '이 스토리라인 싫어요',
    activeVariant: 'destructiveOutline',
    iconClassName: 'rotate-180',
  },
] as const satisfies readonly {
  rating: StorylineRating;
  ariaLabel: string;
  activeVariant: 'primaryOutline' | 'destructiveOutline';
  iconClassName?: string;
}[];

type StorylineRatingButtonsProps = {
  rating: StorylineRating | undefined;
  disabled: boolean;
  onToggle: (rating: StorylineRating) => void;
};

export function StorylineRatingButtons({
  rating,
  disabled,
  onToggle,
}: StorylineRatingButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {RATING_BUTTONS.map((button) => {
        const isActive = rating === button.rating;

        return (
          <Button
            key={button.rating}
            type="button"
            variant={isActive ? button.activeVariant : 'outline'}
            size="icon"
            disabled={disabled}
            aria-pressed={isActive}
            aria-label={button.ariaLabel}
            onClick={() => onToggle(button.rating)}>
            <HugeiconsIcon
              icon={ThumbsUpIcon}
              aria-hidden="true"
              className={button.iconClassName}
            />
          </Button>
        );
      })}
    </div>
  );
}
