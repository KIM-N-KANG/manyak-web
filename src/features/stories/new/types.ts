import type {
  SimpleStoryCustomTagRequestCategory,
  SimpleStorylineResponse,
  SimpleStoryTagListItemResponse,
  SimpleStoryTagListItemResponseCategory,
  StorylineRatingRequestRating,
} from '@/api/generated/models';

import type { STORY_CREATE_STEP_ORDER } from './constants';

export type TagCategory = SimpleStoryTagListItemResponseCategory;

export type StoryCreateStep = (typeof STORY_CREATE_STEP_ORDER)[number];

export type StorylineRating =
  (typeof StorylineRatingRequestRating)[keyof typeof StorylineRatingRequestRating];

export type TagCategoryConfig = {
  value: TagCategory;
  label: string;
  placeholder: string;
  required: boolean;
  maxSelectionCount: number;
};

export type SelectedTagIdsByCategory = Record<TagCategory, number[]>;

export type SelectedCustomTagIdsByCategory = Record<TagCategory, string[]>;

export type CustomTag = {
  id: string;
  name: string;
  category: SimpleStoryCustomTagRequestCategory;
};

export type SelectedTagGroup = {
  category: TagCategory;
  label: string;
  tags: string[];
};

export type AdditionalInfoInput = {
  id: string;
  value: string;
};

export type CustomTagsByCategory = Record<TagCategory, CustomTag[]>;

export type TagsByCategory = Record<
  TagCategory,
  SimpleStoryTagListItemResponse[]
>;

export type StorylineSelectStepSectionProps = {
  storylines: SimpleStorylineResponse[];
  creationId?: string;
  selectedTagGroups: SelectedTagGroup[];
  activeStorylineIndex: number;
  isRegeneratingStorylines: boolean;
  hasRegenerateStorylinesError: boolean;
  isGuestLimitReached: boolean;
  onActiveStorylineIndexChange: (index: number) => void;
  onRegenerateStorylines: () => void;
  onSelectStoryline: () => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};
