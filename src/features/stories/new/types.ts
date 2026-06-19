import type {
  SimpleStoryCustomTagRequestCategory,
  SimpleStorylineResponse,
  SimpleStoryTagListItemResponse,
  SimpleStoryTagListItemResponseCategory,
} from '@/api/generated/models';

export type TagCategory = SimpleStoryTagListItemResponseCategory;

export type StoryCreateStep =
  | 'keyword'
  | 'storyline-select'
  | 'additional-info'
  | 'complete';

export type TagCategoryConfig = {
  value: TagCategory;
  label: string;
  placeholder: string;
  required: boolean;
  maxSelectionCount: number;
};

export type SelectedTagIdsByCategory = Record<TagCategory, number[]>;

export type SelectedCustomKeywordIdsByCategory = Record<TagCategory, string[]>;

export type CustomKeyword = {
  id: string;
  name: string;
  category: SimpleStoryCustomTagRequestCategory;
};

export type AdditionalInfoInput = {
  id: string;
  value: string;
};

export type CustomKeywordsByCategory = Record<TagCategory, CustomKeyword[]>;

export type TagsByCategory = Record<
  TagCategory,
  SimpleStoryTagListItemResponse[]
>;

export type StorylineSelectStepSectionProps = {
  storylines: SimpleStorylineResponse[];
  activeStorylineIndex: number;
  isRegeneratingStorylines: boolean;
  hasRegenerateStorylinesError: boolean;
  onActiveStorylineIndexChange: (index: number) => void;
  onRegenerateStorylines: () => void;
  onSelectStoryline: () => void;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};
