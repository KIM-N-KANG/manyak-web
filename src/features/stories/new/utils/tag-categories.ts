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

/**
 * 모든 태그 카테고리를 키로 갖고 각 값을 초기화한 레코드를 생성한다.
 *
 * @param createValue 각 카테고리의 초기값을 만드는 팩토리 함수
 * @returns 카테고리별 초기값 레코드
 */
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

/**
 * 카테고리별 선택된 사전 정의 태그 ID 목록의 초기값을 생성한다.
 *
 * @returns 카테고리별 빈 태그 ID 목록 레코드
 */
export const createEmptySelectedTagIdsByCategory =
  (): SelectedTagIdsByCategory => createEmptyTagCategoryRecord(() => []);

/**
 * 카테고리별 선택된 커스텀 태그 ID 목록의 초기값을 생성한다.
 *
 * @returns 카테고리별 빈 커스텀 태그 ID 목록 레코드
 */
export const createEmptySelectedCustomTagIdsByCategory =
  (): SelectedCustomTagIdsByCategory => createEmptyTagCategoryRecord(() => []);

/**
 * 카테고리별 커스텀 태그 목록의 초기값을 생성한다.
 *
 * @returns 카테고리별 빈 커스텀 태그 목록 레코드
 */
export const createEmptyCustomTagsByCategory = (): CustomTagsByCategory =>
  createEmptyTagCategoryRecord(() => []);

/**
 * 카테고리별 태그 목록의 초기값을 생성한다.
 *
 * @returns 카테고리별 빈 태그 목록 레코드
 */
export const createEmptyTagsByCategory = (): TagsByCategory =>
  createEmptyTagCategoryRecord(() => []);

/**
 * 카테고리의 최대 선택 가능 개수를 반환한다.
 *
 * @param category 대상 태그 카테고리
 * @returns 해당 카테고리의 최대 선택 개수(없으면 0)
 */
export const getMaxSelectionCount = (category: TagCategory) =>
  TAG_CATEGORIES.find((item) => item.value === category)?.maxSelectionCount ??
  0;

/**
 * 전체 태그 목록을 카테고리별로 분류한다.
 *
 * @param tags 분류할 전체 태그 목록
 * @returns 카테고리별로 묶은 태그 레코드
 */
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
 *
 * @param request 선택 키워드가 담긴 스토리라인 생성 요청(없을 수 있음)
 * @param tags id로 이름을 조회할 전체 태그 목록
 * @returns 카테고리별 선택 태그 그룹 목록
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
