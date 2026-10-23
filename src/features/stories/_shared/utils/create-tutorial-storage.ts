import {
  type CREATE_TUTORIAL_DONE,
  CREATE_TUTORIAL_STAGES,
  CREATE_TUTORIAL_STORAGE_KEY,
  type CreateTutorialStage,
} from '../constants/create-tutorial';

/** 안내를 띄울 수 있는 화면 상태다. 키워드 화면은 첫 인사와 키워드 안내를 함께 받는다. */
export type CreateTutorialScreen = Exclude<CreateTutorialStage, 'intro'>;

/**
 * 지금 화면에서 열 단계를 고른다. 다음에 보일 단계가 이 화면의 단계일 때만 연다. 그래서 초안 이어하기로
 * 중간 단계에 바로 들어오면 앞 단계를 마칠 때까지 열지 않는다.
 *
 * @param next 다음에 보일 단계(없으면 null)
 * @param screen 지금 화면이 안내를 받을 수 있는 상태(없으면 null)
 * @returns 열 단계. 열지 않으면 null
 */
export function resolveCreateTutorialStage(
  next: CreateTutorialStage | null,
  screen: CreateTutorialScreen | null,
): CreateTutorialStage | null {
  if (next === null || screen === null) return null;

  return next === screen || (screen === 'keyword' && next === 'intro')
    ? next
    : null;
}

/**
 * 저장값에서 다음에 보일 단계를 구한다. 저장값이 없으면 첫 단계, 끝났거나 알 수 없는 값이면 없음이다.
 *
 * @param stored 로컬스토리지에서 읽은 마지막으로 마친 단계(없으면 null)
 * @returns 다음 단계. 더 보일 단계가 없으면 null
 */
export function getNextCreateTutorialStage(
  stored: string | null,
): CreateTutorialStage | null {
  if (stored === null) return CREATE_TUTORIAL_STAGES[0];

  const index = CREATE_TUTORIAL_STAGES.indexOf(stored as CreateTutorialStage);

  return index === -1 ? null : (CREATE_TUTORIAL_STAGES[index + 1] ?? null);
}

/**
 * 다음에 보일 단계를 읽는다. 서버 렌더링 시점에는 끝난 것으로 보아 자동으로 열리지 않게 하고,
 * 로컬스토리지가 막힌 환경에서는 처음부터 보인다.
 *
 * @returns 다음 단계. 더 보일 단계가 없으면 null
 */
export function readNextCreateTutorialStage(): CreateTutorialStage | null {
  if (typeof window === 'undefined') return null;

  try {
    return getNextCreateTutorialStage(
      window.localStorage.getItem(CREATE_TUTORIAL_STORAGE_KEY),
    );
  } catch {
    return CREATE_TUTORIAL_STAGES[0];
  }
}

/**
 * 마친 단계를 기록한다. 건너뛰거나 마지막 단계를 마치면 `done`을 기록한다.
 *
 * @param value 마친 단계 또는 `done`
 */
export function markCreateTutorialStage(
  value: CreateTutorialStage | typeof CREATE_TUTORIAL_DONE,
): void {
  try {
    window.localStorage.setItem(CREATE_TUTORIAL_STORAGE_KEY, value);
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 저장을 건너뛴다.
  }
}
