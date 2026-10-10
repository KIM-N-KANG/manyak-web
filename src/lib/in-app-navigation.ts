type InAppNavigationInput = {
  /** Navigation API의 현재 기록 인덱스. API가 없으면 null */
  currentIndex: number | null;
  /** 아래 기록이 같은 문서(클라이언트 이동)인지 돌려준다. 인덱스가 범위를 벗어나면 undefined */
  isSameDocumentAt: (index: number) => boolean | undefined;
  /** 오버레이·퍼널 가드가 쌓아 둔 더미 칸 수 */
  layerEntryCount: number;
  /** 현재 `history.length` */
  historyLength: number;
  /** 이 문서를 처음 열었을 때의 `history.length`. 아직 모르면 null */
  landingHistoryLength: number | null;
};

/**
 * 현재 화면 아래에 기록이 하나라도 있는지 판정한다. 같은 문서인지는 따지지 않는다.
 * 결제 복귀 되감기처럼 다른 문서의 기록만 아래에 있는 화면과, 알림·주소로 바로 열어 아래가 비어 있는 화면을 가른다.
 *
 * @param input 기록 인덱스, 더미 수, 히스토리 길이
 * @returns 아래에 기록이 있으면 true
 */
export function hasPreviousHistoryEntry({
  currentIndex,
  layerEntryCount,
  historyLength,
}: Pick<
  InAppNavigationInput,
  'currentIndex' | 'layerEntryCount' | 'historyLength'
>): boolean {
  if (currentIndex !== null) return currentIndex - layerEntryCount > 0;

  return historyLength - layerEntryCount > 1;
}

/**
 * 헤더 뒤로가기로 돌아갈 앱 안 화면이 아래에 있는지 판정한다.
 *
 * Navigation API가 있으면 더미 칸을 뺀 현재 화면 바로 아래 기록이 같은 문서의 클라이언트 이동인지 본다.
 * 교체 이동은 인덱스를 늘리지 않으므로 알림으로 바로 들어와 새 채팅으로 바꾼 방처럼 아래에 앱 화면이 없는 경우를
 * 가려낸다. API가 없으면 문서를 연 뒤 `history.length`가 늘었는지로 push가 있었는지만 본다.
 *
 * @param input 기록 인덱스와 같은 문서 여부, 더미 수, 히스토리 길이
 * @returns 아래에 앱 안 화면이 있으면 true
 */
export function hasPreviousInAppEntry({
  currentIndex,
  isSameDocumentAt,
  layerEntryCount,
  historyLength,
  landingHistoryLength,
}: InAppNavigationInput): boolean {
  if (currentIndex !== null) {
    const pageIndex = currentIndex - layerEntryCount;

    return pageIndex > 0 && isSameDocumentAt(pageIndex - 1) === true;
  }

  if (landingHistoryLength === null) return false;

  return historyLength - layerEntryCount > landingHistoryLength;
}
