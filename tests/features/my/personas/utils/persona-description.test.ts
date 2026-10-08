import { describe, expect, it } from 'vitest';

import { buildPersonaDescription } from '@/features/my/personas/utils/persona-description';

describe('buildPersonaDescription', () => {
  it('일반 제작 주인공 글과 같은 형식으로 성별 절과 특징을 합친다', () => {
    expect(buildPersonaDescription('FEMALE', '  ## 성격\n차분하다  ')).toBe(
      '# 주인공\n## 성별\n여성\n## 성격\n차분하다',
    );
  });
});
