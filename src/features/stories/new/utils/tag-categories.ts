import type {
  GenerateSimpleStorylinesRequest,
  SimpleStoryCharacterRequest,
  SimpleStoryTagListItemResponse,
} from '@/api/generated/models';

import { CHARACTER_GENDER_OPTIONS, TAG_CATEGORIES } from '../constants';
import type { SelectedTagGroup, TagCategory, TagsByCategory } from '../types';

/**
 * 카테고리별 태그 목록의 초기값을 생성한다.
 *
 * @returns 카테고리별 빈 태그 목록 레코드
 */
export const createEmptyTagsByCategory = (): TagsByCategory =>
  TAG_CATEGORIES.reduce(
    (acc, { value: category }) => ({ ...acc, [category]: [] }),
    {} as TagsByCategory,
  );

/**
 * 카테고리의 최대 선택 가능 개수를 반환한다.
 * 장르는 키워드 개수, 인물 카테고리는 인물 한 명의 특징 개수 상한이다.
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
 * 성별 코드를 화면에 노출하는 라벨로 바꾼다.
 *
 * @param gender 인물 성별 코드(비어 있을 수 있음)
 * @returns 성별 라벨. 값이 없으면 null
 */
const getGenderLabel = (gender: SimpleStoryCharacterRequest['gender']) =>
  CHARACTER_GENDER_OPTIONS.find((option) => option.value === gender)?.label ??
  null;

/**
 * 인물 입력을 이름 · 성별 · 특징 순의 표시용 문자열 목록으로 편다.
 * 비워 둔 항목은 AI가 정하므로 목록에서 제외한다.
 *
 * @param character 인물 입력(없을 수 있음)
 * @param tagNameById 사전 정의 태그 id로 이름을 찾는 맵
 * @returns 표시용 문자열 목록
 */
const getCharacterTags = (
  character: SimpleStoryCharacterRequest | undefined,
  tagNameById: Map<number, string>,
): string[] => {
  if (!character) {
    return [];
  }

  const name = character.name?.trim();
  const genderLabel = getGenderLabel(character.gender);
  const featureNames = (character.featureTagIds ?? [])
    .map((tagId) => tagNameById.get(tagId))
    .filter((tagName): tagName is string => Boolean(tagName));

  return [
    ...(name ? [name] : []),
    ...(genderLabel ? [genderLabel] : []),
    ...featureNames,
    ...(character.customTags ?? []),
  ];
};

/**
 * 스토리라인 생성 요청에 담긴 선택 입력을 표시용 그룹 목록으로 변환한다.
 * 장르는 한 그룹, 주인공과 주변 인물은 인물마다 한 그룹으로 나눈다.
 * 값이 하나도 없는 그룹은 결과에서 제외한다.
 *
 * @param request 선택 입력이 담긴 스토리라인 생성 요청(없을 수 있음)
 * @param tags id로 이름을 조회할 전체 태그 목록
 * @returns 표시용 선택 입력 그룹 목록
 */
export const getSelectedKeywordGroups = (
  request: GenerateSimpleStorylinesRequest | null,
  tags: SimpleStoryTagListItemResponse[],
): SelectedTagGroup[] => {
  if (!request) {
    return [];
  }

  const tagNameById = new Map(
    tags
      .filter((tag) => tag.id != null && Boolean(tag.name))
      .map((tag) => [tag.id as number, tag.name as string] as const),
  );

  const genreTags = (request.genreTagIds ?? [])
    .map((tagId) => tagNameById.get(tagId))
    .filter((tagName): tagName is string => Boolean(tagName));

  const supportingCharacters = request.supportingCharacters ?? [];

  const groups: SelectedTagGroup[] = [
    { id: 'GENRE', label: '장르', tags: genreTags },
    {
      id: 'PROTAGONIST',
      label: '주인공',
      tags: getCharacterTags(request.protagonist, tagNameById),
    },
    ...supportingCharacters.map((character, index) => ({
      id: `SUPPORTING_CHARACTER-${index}`,
      label:
        supportingCharacters.length > 1
          ? `주변 인물 ${index + 1}`
          : '주변 인물',
      tags: getCharacterTags(character, tagNameById),
    })),
  ];

  return groups.filter((group) => group.tags.length > 0);
};
