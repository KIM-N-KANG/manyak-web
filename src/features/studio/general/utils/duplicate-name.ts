/** 이름으로 식별하는 입력 목록의 중복 판정이다. */

/**
 * 앞 항목과 이름이 겹치는 항목의 id를 모은다. 먼저 쓴 이름은 두고 뒤에 같은 이름을 쓴 항목만 고른다.
 * 주요 사건·주변 인물(앞에 주인공을 둠)·시작 상황별 엔딩처럼 서버가 이름으로 식별해 중복을 막는 목록에 쓴다.
 * 서버는 이름을 그대로 비교한다. 앞뒤 공백은 보내기 전에 빼는 것으로 보고, 앞뒤 공백만 빼고 같으면 겹친 것으로 본다.
 * 빈 이름은 필수 검사가 맡으므로 보지 않는다.
 *
 * @param items 입력 순서대로 놓인 이름 항목
 * @returns 이름이 앞 항목과 겹친 항목의 id 집합
 */
export function getDuplicateNameIds(items: { id: string; name: string }[]) {
  const seenNames = new Set<string>();
  const duplicateIds = new Set<string>();

  items.forEach(({ id, name }) => {
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    if (seenNames.has(trimmed)) {
      duplicateIds.add(id);

      return;
    }

    seenNames.add(trimmed);
  });

  return duplicateIds;
}

/** 주인공을 주변 인물보다 앞에 두고 판정할 때 쓰는 id다. 주변 인물 id는 UUID라 겹치지 않는다. */
const PROTAGONIST_ID = 'protagonist';

/**
 * 주인공 이름이나 앞선 주변 인물과 이름이 겹친 주변 인물의 id를 모은다. 주인공은 늘 먼저 쓴 쪽으로 본다.
 *
 * @param protagonistName 주인공 이름
 * @param supporting 입력 순서대로 놓인 주변 인물
 * @returns 이름이 겹친 주변 인물의 id 집합
 */
export function getDuplicateCharacterNameIds(
  protagonistName: string,
  supporting: { id: string; name: string }[],
) {
  return getDuplicateNameIds([
    { id: PROTAGONIST_ID, name: protagonistName },
    ...supporting,
  ]);
}
