import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';

import { TAG_CATEGORIES } from '../constants';
import type {
  CustomKeywordsByCategory,
  SelectedCustomKeywordIdsByCategory,
  SelectedTagIdsByCategory,
  TagCategory,
  TagsByCategory,
} from '../types';

const createEmptyTagCategoryRecord = <Value>(
  createValue: () => Value,
): Record<TagCategory, Value> =>
  TAG_CATEGORIES.reduce(
    (acc, { value: category }) => ({
      ...acc,
      [category]: createValue(),
    }),
    {} as Record<TagCategory, Value>,
  );

export const createEmptySelectedTagIdsByCategory =
  (): SelectedTagIdsByCategory => createEmptyTagCategoryRecord(() => []);

export const createEmptySelectedCustomKeywordIdsByCategory =
  (): SelectedCustomKeywordIdsByCategory =>
    createEmptyTagCategoryRecord(() => []);

export const createEmptyCustomKeywordsByCategory =
  (): CustomKeywordsByCategory => createEmptyTagCategoryRecord(() => []);

export const createEmptyTagsByCategory = (): TagsByCategory =>
  createEmptyTagCategoryRecord(() => []);

export const getMaxSelectionCount = (category: TagCategory) =>
  TAG_CATEGORIES.find((item) => item.value === category)?.maxSelectionCount ??
  0;

export const getTagsByCategory = (
  tags: SimpleStoryTagListItemResponse[],
): TagsByCategory =>
  TAG_CATEGORIES.reduce<TagsByCategory>((acc, { value: category }) => {
    acc[category] = tags.filter((tag) => tag.category === category);

    return acc;
  }, createEmptyTagsByCategory());
