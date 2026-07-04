import type {
  GenerateSimpleStorylinesRequest,
  SimpleStoryTagListItemResponse,
} from '@/api/generated/models';

import { TAG_CATEGORIES } from '../constants';
import type {
  CustomTagsByCategory,
  SelectedCustomTagIdsByCategory,
  SelectedTagGroup,
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

export const createEmptySelectedCustomTagIdsByCategory =
  (): SelectedCustomTagIdsByCategory => createEmptyTagCategoryRecord(() => []);

export const createEmptyCustomTagsByCategory = (): CustomTagsByCategory =>
  createEmptyTagCategoryRecord(() => []);

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

/**
 * 스토리라인 생성 요청에 담긴 선택 키워드를 카테고리별 그룹으로 변환한다.
 * 사전 정의 태그는 전체 태그 목록에서 id로 이름을 찾고, 직접 추가 태그는 이름을 그대로 사용한다.
 * 선택값이 없는 카테고리는 결과에서 제외한다.
 */
export const getSelectedTagsByCategory = (
  request: GenerateSimpleStorylinesRequest | null,
  tags: SimpleStoryTagListItemResponse[],
): SelectedTagGroup[] => {
  if (!request) {
    return [];
  }

  const tagById = new Map(
    tags
      .filter((tag) => tag.id != null && Boolean(tag.name))
      .map((tag) => [tag.id, tag] as const),
  );

  return TAG_CATEGORIES.reduce<SelectedTagGroup[]>(
    (groups, { value: category, label }) => {
      const predefinedTagNames = (request.selectedTagIds ?? [])
        .map((tagId) => tagById.get(tagId))
        .filter(
          (tag): tag is SimpleStoryTagListItemResponse =>
            Boolean(tag) && tag?.category === category,
        )
        .map((tag) => tag.name)
        .filter((name): name is string => Boolean(name));

      const customTagNames = (request.customTags ?? [])
        .filter((tag) => tag.category === category)
        .map((tag) => tag.name)
        .filter((name): name is string => Boolean(name));

      const tags = [...predefinedTagNames, ...customTagNames];

      if (tags.length > 0) {
        groups.push({ category, label, tags });
      }

      return groups;
    },
    [],
  );
};
