import { describe, expect, it } from 'vitest';

import {
  buildPersonaDescription,
  parsePersonaDescription,
} from '@/features/my/personas/utils/persona-description';

describe('buildPersonaDescription', () => {
  it('일반 제작 주인공 글과 같은 형식으로 성별 절과 특징을 합친다', () => {
    expect(buildPersonaDescription('FEMALE', '  ## 성격\n차분하다  ')).toBe(
      '# 주인공\n## 성별\n여성\n## 성격\n차분하다',
    );
  });
});

describe('parsePersonaDescription', () => {
  it('합친 글을 다시 나누면 원래 성별과 특징이 나온다', () => {
    expect(
      parsePersonaDescription(buildPersonaDescription('MALE', '## 성격\n침착')),
    ).toEqual({ gender: 'MALE', feature: '## 성격\n침착' });
  });

  it('형식이 다른 글은 성별 없이 통째로 특징에 둔다', () => {
    expect(parsePersonaDescription('# 주인공\n## 성별\n미정\n본문')).toEqual({
      gender: null,
      feature: '# 주인공\n## 성별\n미정\n본문',
    });
    expect(parsePersonaDescription('자유롭게 쓴 소개')).toEqual({
      gender: null,
      feature: '자유롭게 쓴 소개',
    });
  });
});
