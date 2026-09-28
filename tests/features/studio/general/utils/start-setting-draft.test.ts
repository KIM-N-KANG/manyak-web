import { describe, expect, it } from 'vitest';

import {
  createEndingDraft,
  createStartSettingDraft,
  getStartSettingLabel,
  hasEndingInput,
  hasStartSettingInput,
  normalizeMinTurns,
} from '@/features/studio/general/utils/start-setting-draft';

describe('getStartSettingLabel', () => {
  it('이름이 비어 있으면 기본 라벨을 쓴다', () => {
    expect(getStartSettingLabel('  ', '시작 상황 1', 8)).toBe('시작 상황 1');
  });

  it('8자까지는 그대로, 넘으면 8자에서 잘라 줄임표를 붙인다', () => {
    expect(getStartSettingLabel(' 불 꺼진 승강장 ', '시작 상황 1', 8)).toBe(
      '불 꺼진 승강장',
    );
    expect(getStartSettingLabel('불 꺼진 승강장의 밤', '시작 상황 1', 8)).toBe(
      '불 꺼진 승강장…',
    );
  });

  it('이모지는 한 글자로 센다', () => {
    expect(getStartSettingLabel('🚉🚉🚉🚉🚉🚉🚉🚉🚉', '', 8)).toBe(
      '🚉🚉🚉🚉🚉🚉🚉🚉…',
    );
  });
});

describe('normalizeMinTurns', () => {
  it('숫자만 남기고 상한으로 자른다', () => {
    expect(normalizeMinTurns('1a2', 50)).toBe('12');
    expect(normalizeMinTurns('99', 50)).toBe('50');
    expect(normalizeMinTurns('007', 50)).toBe('7');
  });

  it('숫자가 없으면 빈 문자열이다', () => {
    expect(normalizeMinTurns('턴', 50)).toBe('');
    expect(normalizeMinTurns('', 50)).toBe('');
  });
});

describe('hasStartSettingInput·hasEndingInput', () => {
  it('비었거나 공백뿐이면 입력이 없다', () => {
    const startSetting = createStartSettingDraft();

    expect(hasStartSettingInput(startSetting)).toBe(false);
    expect(
      hasStartSettingInput({
        ...startSetting,
        suggestedInputs: [' ', '', '\n'],
      }),
    ).toBe(false);
    expect(hasEndingInput(createEndingDraft())).toBe(false);
  });

  it('칸 하나라도 쓰였거나 엔딩이 있으면 입력이 있다', () => {
    const startSetting = createStartSettingDraft();

    expect(
      hasStartSettingInput({
        ...startSetting,
        suggestedInputs: ['', '문을 연다', ''],
      }),
    ).toBe(true);
    expect(
      hasStartSettingInput({
        ...startSetting,
        endings: [createEndingDraft()],
      }),
    ).toBe(true);
    expect(hasEndingInput({ ...createEndingDraft(), minTurns: '10' })).toBe(
      true,
    );
  });
});
