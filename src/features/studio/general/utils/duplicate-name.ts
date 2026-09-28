/** 이름으로 식별하는 입력 목록의 중복 판정이다. */

/**
 * 앞 항목과 이름이 겹치는 항목의 id를 모은다. 먼저 쓴 이름은 두고 뒤에 같은 이름을 쓴 항목만 고른다.
 * 주요 사건처럼 서버가 이름으로 식별해 중복을 막는 목록에 쓴다.
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
