import type {
  SimpleStoryCustomTagRequestCategory,
  SimpleStoryTagListItemResponse,
  SimpleStoryTagListItemResponseCategory,
} from '@/services/generated/api/model';

export type TagCategory = SimpleStoryTagListItemResponseCategory;

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

export type CustomKeywordsByCategory = Record<TagCategory, CustomKeyword[]>;

export type TagsByCategory = Record<
  TagCategory,
  SimpleStoryTagListItemResponse[]
>;
