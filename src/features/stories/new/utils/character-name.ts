import type { CharacterInput } from '../types';

/**
 * 인물 이름의 동일성 판정 키를 만든다.
 * 서버가 400으로 막을 때 쓰는 규칙(NFC 정규화 → 공백 제거 → lowercase)과 같아,
 * 클라이언트에서 통과한 이름은 서버에서도 통과한다.
 *
 * @param name 판정할 인물 이름
 * @returns 비교용 정규화 키. 이름이 비어 있으면 빈 문자열
 */
export const getCharacterNameKey = (name: string): string =>
  name.normalize('NFC').replace(/\s+/g, '').toLowerCase();

/**
 * 저장 인물 이미지 마커와 충돌하는 문자가 이름에 있는지 확인한다.
 *
 * @param name 확인할 인물 이름
 * @returns 닫는 대괄호가 포함돼 있으면 true, 아니면 false
 */
export const hasReservedCharacterNameCharacter = (name: string): boolean =>
  name.includes(']');

/**
 * 앞선 인물과 이름이 겹치는 인물의 id를 모은다.
 * 주인공을 먼저 보고 주변 인물을 입력 순서로 보므로, 먼저 쓴 이름이 남고 뒤에 같은
 * 이름을 쓴 인물만 걸린다. 비워 둔 이름은 AI가 각각 지어 주므로 판정 대상이 아니다.
 *
 * @param characters 주인공을 앞에 둔 인물 입력 목록
 * @returns 이름이 중복된 인물의 id 집합
 */
export const getDuplicateNameCharacterIds = (
  characters: CharacterInput[],
): Set<string> => {
  const seenKeys = new Set<string>();
  const duplicateIds = new Set<string>();

  characters.forEach((character) => {
    const key = getCharacterNameKey(character.name);

    if (!key) {
      return;
    }

    if (seenKeys.has(key)) {
      duplicateIds.add(character.id);

      return;
    }

    seenKeys.add(key);
  });

  return duplicateIds;
};
