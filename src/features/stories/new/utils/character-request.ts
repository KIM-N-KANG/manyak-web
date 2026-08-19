import type { SimpleStoryCharacterRequest } from '@/api/generated/models';

import type { CharacterInput } from '../types';

/**
 * 인물 입력을 서버 요청 형식으로 바꾼다.
 * 이름은 공백을 다듬고, 비어 있으면 null로 보내 AI가 정하게 한다.
 * 직접 추가한 특징은 선택 상태인 것만 이름으로 싣는다.
 *
 * @param character 변환할 인물 입력
 * @returns 스토리라인 생성 요청에 실을 인물 객체
 */
export const toCharacterRequest = (
  character: CharacterInput,
): SimpleStoryCharacterRequest => ({
  name: character.name.trim() || null,
  gender: character.gender,
  featureTagIds: character.selectedTagIds,
  customTags: character.customTags
    .filter((customTag) =>
      character.selectedCustomTagIds.includes(customTag.id),
    )
    .map((customTag) => customTag.name),
});
