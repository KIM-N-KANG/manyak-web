import { useSyncExternalStore } from 'react';

/**
 * 스토리 상세에서 페르소나 생성으로 갔다가 돌아올 때 새 페르소나를 미리 선택해 두는 메모리 저장소다.
 * 생성 화면은 어느 스토리에서 왔는지 모르므로 상세가 이동 직전에 출발 스토리를 남기고, 생성에 성공하면
 * 그 스토리에 새 페르소나를 묶는다. 새로고침하면 사라지는 일회성 값이다.
 */

let originStoryId: string | null = null;
let created: { storyId: string; personaId: string } | null = null;
/** 채팅 시작 시트에서 페르소나 생성으로 떠난 스토리. 그 상세로 돌아오면 시트를 다시 연다. */
let startSheetOriginStoryId: string | null = null;

const listeners = new Set<() => void>();

/**
 * 저장소 변경 구독을 등록한다.
 *
 * @param listener 값이 바뀌면 부를 함수
 * @returns 구독 해제 함수
 */
const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/**
 * 구독자에게 값이 바뀌었음을 알린다.
 *
 * @returns 없음
 */
const emit = () => listeners.forEach((listener) => listener());

/**
 * 페르소나 생성 화면으로 떠나는 스토리를 남긴다.
 *
 * @param storyId 출발 스토리 ID
 * @param options 채팅 시작 시트에서 떠났는지
 */
export function markPersonaCreationOrigin(
  storyId: string,
  { fromStartSheet = false }: { fromStartSheet?: boolean } = {},
) {
  originStoryId = storyId;
  startSheetOriginStoryId = fromStartSheet ? storyId : null;
}

/**
 * 채팅 시작 시트에서 페르소나 생성으로 떠났다가 이 스토리 상세로 돌아왔는지 읽는다. 상세가 마운트 때 읽고
 * {@link clearStartSheetReturn}으로 지운다.
 *
 * @param storyId 상세 스토리 ID
 * @returns 시트를 다시 열어야 하면 true
 */
export function isStartSheetReturn(storyId: string) {
  return startSheetOriginStoryId === storyId;
}

/** 시작 시트를 다시 열 표시를 지운다. 상세가 마운트되면 어느 스토리든 지워 한 번만 다시 연다. */
export function clearStartSheetReturn() {
  startSheetOriginStoryId = null;
}

/**
 * 출발 스토리가 있으면 새로 만든 페르소나를 그 스토리의 선택으로 남긴다.
 *
 * @param personaId 새로 만든 페르소나 ID
 */
export function selectCreatedPersona(personaId: string) {
  if (!originStoryId) {
    return;
  }

  created = { storyId: originStoryId, personaId };
  originStoryId = null;
  emit();
}

/** 미리 선택해 둔 페르소나를 지운다. 사용자가 직접 고르거나 채팅을 시작하면 부른다. */
export function clearCreatedPersona() {
  if (!created) {
    return;
  }

  created = null;
  emit();
}

/**
 * 스토리에 미리 선택해 둔 새 페르소나 ID를 읽는다.
 *
 * @param storyId 상세 스토리 ID
 * @returns 이 스토리에서 만든 새 페르소나 ID, 없으면 null
 */
export function useCreatedPersonaId(storyId: string) {
  return useSyncExternalStore(
    subscribe,
    () => (created?.storyId === storyId ? created.personaId : null),
    () => null,
  );
}
