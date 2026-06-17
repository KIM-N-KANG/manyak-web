import type {
  SimpleStoryCustomTagRequestCategory,
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
