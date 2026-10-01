/** 시작 상황 설정 탭의 입력 상태와 표시 규칙이다. */

export type GeneralStoryEndingDraft = {
  id: string;
  name: string;
  /** 숫자만 담긴 문자열이다. 비어 있으면 아직 입력하지 않은 것이다. */
  minTurns: string;
  condition: string;
  epilogue: string;
};

export type GeneralStoryStartSettingDraft = {
  id: string;
  name: string;
  prologue: string;
  situation: string;
  suggestedInputs: [string, string, string];
  endings: GeneralStoryEndingDraft[];
};

export const createStartSettingDraft = (): GeneralStoryStartSettingDraft => ({
  id: crypto.randomUUID(),
  name: '',
  prologue: '',
  situation: '',
  suggestedInputs: ['', '', ''],
  endings: [],
});

export const createEndingDraft = (): GeneralStoryEndingDraft => ({
  id: crypto.randomUUID(),
  name: '',
  minTurns: '',
  condition: '',
  epilogue: '',
});

/**
 * 이름이 있으면 앞뒤 공백을 뺀 이름을, 없으면 기본 라벨을 쓴다. `maxLength`자(코드 포인트)를
 * 넘으면 잘라 줄임표를 붙인다.
 */
export function getStartSettingLabel(
  name: string,
  fallback: string,
  maxLength: number,
) {
  const characters = [...name.trim()];

  if (characters.length === 0) {
    return fallback;
  }

  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join('')}…`
    : characters.join('');
}

/** 최소 턴 수 입력에서 숫자만 남기고 `max`를 넘지 않게 자른다. 비우면 빈 문자열이다. */
export function normalizeMinTurns(input: string, max: number) {
  const digits = input.replace(/\D/g, '');

  return digits ? String(Math.min(max, Number(digits))) : '';
}

const hasText = (...values: string[]) => values.some((value) => value.trim());

/** 엔딩에 입력한 내용이 있는지 반환한다. 삭제 전 확인 여부를 정할 때 쓴다. */
export const hasEndingInput = (ending: GeneralStoryEndingDraft) =>
  hasText(ending.name, ending.minTurns, ending.condition, ending.epilogue);

/** 시작 상황에 입력한 내용(엔딩 포함)이 있는지 반환한다. */
export const hasStartSettingInput = (
  startSetting: GeneralStoryStartSettingDraft,
) =>
  hasText(
    startSetting.name,
    startSetting.prologue,
    startSetting.situation,
    ...startSetting.suggestedInputs,
  ) || startSetting.endings.length > 0;
