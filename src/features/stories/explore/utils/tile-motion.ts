/** 탐색 그리드의 열 수. */
const COLUMNS = 3;

/** 대각선 한 칸마다 늦추는 시간(초). */
const WAVE_STEP_SECONDS = 0.045;

/** 물결이 길어지지 않게 막는 지연 상한(초). */
const WAVE_MAX_DELAY_SECONDS = 0.45;

/** 새 표지가 나타나는 시간(초). */
export const TILE_ENTER_SECONDS = 0.42;

/** 동작 줄이기에서 크기 변화 없이 표지를 바꾸는 시간(초). */
export const TILE_REDUCED_SECONDS = 0.2;

/** 천천히 멈추는 감속 곡선. 새 표지가 제자리에 내려앉는 느낌을 준다. */
export const TILE_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 새로 섞은 탐색 그리드에서 칸이 바뀌기 시작하는 지연을 계산한다.
 * 그리드는 칸 순번을 키로 써서 자리를 유지하고, 칸 안에서 이전 표지 위에 새 표지를 겹쳐 바꾼다.
 * 새 표지는 이미지를 다 받은 뒤 나타나고, 이전 표지는 새 표지가 다 나타난 뒤에야 걷어 내 빈 칸이 보이지 않는다.
 * 왼쪽 위 칸부터 대각선 순서로 늦춰 오른쪽 아래로 퍼지는 물결을 만든다.
 *
 * @param position 그리드에서 0부터 센 칸 순번
 * @returns 지연(초). 상한을 넘지 않는다
 */
export function tileEnterDelay(position: number): number {
  const row = Math.floor(position / COLUMNS);
  const column = position % COLUMNS;

  return Math.min((row + column) * WAVE_STEP_SECONDS, WAVE_MAX_DELAY_SECONDS);
}
