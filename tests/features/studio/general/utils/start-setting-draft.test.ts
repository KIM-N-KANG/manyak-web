import { describe, expect, it } from 'vitest';

import {
  getStartSettingLabel,
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
